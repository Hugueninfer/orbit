"""Atomic integer-money ledger, recurrence and card billing commands."""

from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .db import database
from .domain import add_months, billing_cycle, month_date, split_installments
from .identity import authenticated
from .models import User
from .responses import (
    FinanceReport,
    Generated,
    InvoiceOut,
    PurchaseOut,
    PurchasePreview,
    TransactionOut,
    TransferOut,
)
from .schemas import Horizon, PaymentCreate, Preview, PurchaseCreate, Reason, TransferCreate
from .store import add, audit, idempotent, owned, problem, public, rows, today, update

router = APIRouter()


def ledger_rows(db, user):
    all_rows = rows(db, user, "transaction")
    reversed_ids = {r.data["reversal_of"] for r in all_rows if r.data["reversal_of"]}
    return [r for r in all_rows if r.data["status"] != "cancelled" or str(r.id) in reversed_ids]


def account_balances(db, user, account):
    current = projected = account.data["opening_balance"]
    for row in ledger_rows(db, user):
        d = row.data
        if d["account_id"] != str(account.id):
            continue
        signed = d["amount"] * (1 if d["transaction_kind"] == "income" else -1)
        projected += signed
        if d["status"] != "planned":
            current += signed
    return {"current_balance": current, "projected_balance": projected}


def transaction(db, user, **values):
    defaults = {
        "category_id": None,
        "transfer_id": None,
        "invoice_id": None,
        "recurrence_id": None,
        "reversal_of": None,
        "status": "posted",
    }
    return add(db, user, "transaction", {**defaults, **values})


@router.post("/transfers", status_code=201, response_model=TransferOut)
def transfer(
    body: TransferCreate,
    request: Request,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    def command():
        source = owned(db, user, "account", body.from_account_id)
        target = owned(db, user, "account", body.to_account_id)
        if source.id == target.id:
            problem(422, "Contas de origem e destino devem ser diferentes")
        if source.data["currency"] != target.data["currency"]:
            problem(422, "Transferências exigem a mesma moeda")
        if source.data["archived"] or target.data["archived"]:
            problem(422, "Conta arquivada")
        row = add(db, user, "transfer", {**body.model_dump(mode="json"), "currency": source.data["currency"]})
        for account, kind in [(source, "expense"), (target, "income")]:
            transaction(
                db,
                user,
                account_id=str(account.id),
                transaction_kind=kind,
                amount=body.amount,
                currency=source.data["currency"],
                description=body.description,
                date=body.date.isoformat(),
                transfer_id=str(row.id),
            )
        audit(db, user, "transferred", row, row.data)
        return public(row)

    return idempotent(db, user, request, body.model_dump(mode="json"), command)


@router.post("/transactions/{identifier}/reverse", response_model=TransactionOut)
def reverse(
    identifier: str,
    body: Reason,
    request: Request,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    def command():
        row = owned(db, user, "transaction", identifier)
        data = row.data
        if data["status"] != "posted" or data["transfer_id"] or data["invoice_id"] or data["reversal_of"]:
            problem(409, "Este lançamento não permite estorno independente")
        transaction(
            db,
            user,
            **{
                **data,
                "transaction_kind": "expense" if data["transaction_kind"] == "income" else "income",
                "description": "Estorno: " + data["description"],
                "date": today(user).isoformat(),
                "reversal_of": str(row.id),
                "recurrence_id": None,
            },
        )
        update(db, user, row, {"status": "cancelled"}, "reversed")
        audit(db, user, "reversal_reason", row, {"reason": body.reason})
        return public(row)

    return idempotent(db, user, request, body.model_dump(), command)


def generate_recurrences(db, user, through_date):
    if through_date > today(user) + timedelta(days=366):
        problem(422, "Horizonte máximo de 366 dias")
    existing = {
        (r.data["recurrence_id"], r.data["date"])
        for r in rows(db, user, "transaction")
        if r.data["recurrence_id"]
    }
    count = 0
    for recurrence in rows(db, user, "recurrence"):
        d = recurrence.data
        if not d["active"]:
            continue
        start = date.fromisoformat(d["start_date"])
        # A bounded extension cannot generate years of forgotten occurrences.
        if (through_date - start).days > 3660:
            problem(422, "Recorrência anterior ao horizonte máximo histórico de dez anos")
        occurrence = month_date(start.year, start.month, d["day_of_month"])
        if occurrence < start:
            occurrence = add_months(occurrence, 1, d["day_of_month"])
        while occurrence <= through_date:
            key = (str(recurrence.id), occurrence.isoformat())
            if key not in existing:
                transaction(
                    db,
                    user,
                    account_id=d["account_id"],
                    category_id=d["category_id"],
                    transaction_kind=d["transaction_kind"],
                    amount=d["amount"],
                    currency=d["currency"],
                    description=d["description"],
                    date=occurrence.isoformat(),
                    status="planned",
                    recurrence_id=str(recurrence.id),
                )
                count += 1
                existing.add(key)
            occurrence = add_months(occurrence, 1, d["day_of_month"])
    return {"created": count}


@router.post("/recurrences/generate", response_model=Generated)
def generate(body: Horizon, user: User = Depends(authenticated), db: Session = Depends(database)):
    return generate_recurrences(db, user, body.through_date)


def preview(card, amount, count, purchased):
    amounts = split_installments(amount, count)
    close, _ = billing_cycle(purchased, card.data["close_day"], card.data["due_day"])
    values = []
    for i, amount in enumerate(amounts):
        installment_close = add_months(close, i, card.data["close_day"])
        _, due = billing_cycle(installment_close, card.data["close_day"], card.data["due_day"])
        values.append(
            {
                "number": i + 1,
                "amount": amount,
                "close_date": installment_close.isoformat(),
                "due_date": due.isoformat(),
            }
        )
    return {"total": sum(amounts), "installments": values}


@router.post("/cards/{identifier}/preview", response_model=PurchasePreview)
def purchase_preview(
    identifier: str, body: Preview, user: User = Depends(authenticated), db: Session = Depends(database)
):
    return preview(
        owned(db, user, "card", identifier), body.amount, body.installment_count, body.purchase_date
    )


def invoice_for(db, user, card_id, close, due):
    for invoice in rows(db, user, "invoice"):
        if invoice.data["card_id"] == card_id and invoice.data["close_date"] == close:
            return invoice
    return add(db, user, "invoice", {"card_id": card_id, "close_date": close, "due_date": due})


def purchase_data(db, user, purchase):
    installments = [
        public(r) for r in rows(db, user, "installment") if r.data["purchase_id"] == str(purchase.id)
    ]
    return {
        **public(purchase),
        "installments": sorted(installments, key=lambda x: (x["number"], x["amount"])),
    }


def create_purchase(db, user, data):
    card = owned(db, user, "card", data["card_id"])
    if card.data["archived"]:
        problem(422, "Cartão arquivado")
    if data.get("category_id"):
        category = owned(db, user, "category", data["category_id"])
        if category.data["category_kind"] != "expense":
            problem(422, "Compra exige categoria de despesa")
    planned = preview(
        card, data["amount"], data["installment_count"], date.fromisoformat(data["purchase_date"])
    )
    purchase = add(db, user, "purchase", {**data, "status": "active"})
    for installment in planned["installments"]:
        invoice = invoice_for(db, user, str(card.id), installment["close_date"], installment["due_date"])
        add(
            db,
            user,
            "installment",
            {
                **installment,
                "purchase_id": str(purchase.id),
                "invoice_id": str(invoice.id),
                "is_refund": False,
            },
        )
    audit(db, user, "purchased", purchase, purchase.data)
    return purchase_data(db, user, purchase)


@router.post("/purchases", status_code=201, response_model=PurchaseOut)
def buy(
    body: PurchaseCreate,
    request: Request,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    return idempotent(
        db,
        user,
        request,
        body.model_dump(mode="json"),
        lambda: create_purchase(db, user, body.model_dump(mode="json")),
    )


@router.get("/purchases", response_model=list[PurchaseOut])
def purchases(user: User = Depends(authenticated), db: Session = Depends(database)):
    return [purchase_data(db, user, r) for r in rows(db, user, "purchase")]


@router.get("/purchases/{identifier}", response_model=PurchaseOut)
def purchase_detail(identifier: str, user: User = Depends(authenticated), db: Session = Depends(database)):
    return purchase_data(db, user, owned(db, user, "purchase", identifier))


def invoice_data(db, user, invoice):
    all_purchases = {str(r.id): r for r in rows(db, user, "purchase")}
    items = []
    for row in rows(db, user, "installment"):
        d = row.data
        if (
            d["invoice_id"] != str(invoice.id)
            or all_purchases[d["purchase_id"]].data["status"] == "cancelled"
        ):
            continue
        items.append(
            {
                "id": str(row.id),
                "purchase_id": d["purchase_id"],
                "description": ("Estorno: " if d["is_refund"] else "")
                + all_purchases[d["purchase_id"]].data["description"],
                "number": d["number"],
                "amount": d["amount"],
            }
        )
    payments = [public(r) for r in rows(db, user, "payment") if r.data["invoice_id"] == str(invoice.id)]
    raw_total = sum(i["amount"] for i in items)
    # A refund credit belongs to its open cycle and offsets later obligations.
    # Closed original installments remain untouched.
    credit = 0
    earlier = sorted(
        [
            r
            for r in rows(db, user, "invoice")
            if r.data["card_id"] == invoice.data["card_id"]
            and r.data["close_date"] < invoice.data["close_date"]
        ],
        key=lambda r: r.data["close_date"],
    )
    all_installments = rows(db, user, "installment")
    all_payments = rows(db, user, "payment")
    for previous in earlier:
        previous_total = sum(
            r.data["amount"]
            for r in all_installments
            if r.data["invoice_id"] == str(previous.id)
            and all_purchases[r.data["purchase_id"]].data["status"] != "cancelled"
        )
        previous_paid = sum(
            r.data["amount"] for r in all_payments if r.data["invoice_id"] == str(previous.id)
        )
        credit = min(0, previous_total + credit - previous_paid)
    total = raw_total + credit
    paid = sum(p["amount"] for p in payments)
    remaining = max(0, total - paid)
    current = today(user).isoformat()
    status = "open" if current <= invoice.data["close_date"] else "closed"
    if paid > 0:
        status = "partial"
    if remaining == 0 and total >= 0:
        status = "paid"
    elif remaining and current > invoice.data["due_date"]:
        status = "overdue"
    return {
        **public(invoice),
        "total": total,
        "credit_brought_forward": -credit,
        "paid": paid,
        "remaining": remaining,
        "status": status,
        "items": items,
        "payments": payments,
    }


@router.get("/invoices", response_model=list[InvoiceOut])
def invoices(
    card_id: str | None = None, user: User = Depends(authenticated), db: Session = Depends(database)
):
    if card_id:
        owned(db, user, "card", card_id)
    return sorted(
        [
            invoice_data(db, user, r)
            for r in rows(db, user, "invoice")
            if not card_id or r.data["card_id"] == card_id
        ],
        key=lambda x: x["close_date"],
    )


@router.get("/invoices/{identifier}", response_model=InvoiceOut)
def invoice_detail(identifier: str, user: User = Depends(authenticated), db: Session = Depends(database)):
    return invoice_data(db, user, owned(db, user, "invoice", identifier))


@router.post("/invoices/{identifier}/payments", response_model=InvoiceOut)
def pay(
    identifier: str,
    body: PaymentCreate,
    request: Request,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    def command():
        invoice = owned(db, user, "invoice", identifier)
        account = owned(db, user, "account", body.account_id)
        card = owned(db, user, "card", invoice.data["card_id"])
        if account.data["currency"] != card.data["currency"] or account.data["archived"]:
            problem(422, "Conta inválida ou moeda incompatível")
        if body.amount > invoice_data(db, user, invoice)["remaining"]:
            problem(422, "Pagamento excede o saldo da fatura")
        payment = add(db, user, "payment", {"invoice_id": str(invoice.id), **body.model_dump(mode="json")})
        transaction(
            db,
            user,
            account_id=str(account.id),
            transaction_kind="expense",
            amount=body.amount,
            currency=card.data["currency"],
            description="Pagamento fatura " + card.data["name"],
            date=body.date.isoformat(),
            invoice_id=str(invoice.id),
        )
        update(db, user, invoice, {}, "invoice_paid")
        audit(db, user, "payment_created", payment, payment.data)
        return invoice_data(db, user, invoice)

    return idempotent(db, user, request, body.model_dump(mode="json"), command)


def correct_purchase(db, user, identifier, reason, refund):
    purchase = owned(db, user, "purchase", identifier)
    if purchase.data["status"] != "active":
        problem(409, "Compra já corrigida")
    installments = [r for r in rows(db, user, "installment") if r.data["purchase_id"] == str(purchase.id)]
    if not refund:
        if any(r.data["close_date"] < today(user).isoformat() for r in installments):
            problem(409, "Ciclo fechado exige estorno; histórico preservado")
        if any(
            invoice_data(db, user, owned(db, user, "invoice", r.data["invoice_id"]))["paid"]
            for r in installments
        ):
            problem(409, "Fatura com pagamento exige estorno")
        update(db, user, purchase, {"status": "cancelled"}, "purchase_cancelled")
    else:
        card = owned(db, user, "card", purchase.data["card_id"])
        close, due = billing_cycle(today(user), card.data["close_day"], card.data["due_day"])
        invoice = invoice_for(db, user, str(card.id), close.isoformat(), due.isoformat())
        add(
            db,
            user,
            "installment",
            {
                "purchase_id": str(purchase.id),
                "invoice_id": str(invoice.id),
                "number": 0,
                "amount": -purchase.data["amount"],
                "close_date": close.isoformat(),
                "due_date": due.isoformat(),
                "is_refund": True,
            },
        )
        update(db, user, purchase, {"status": "refunded"}, "purchase_refunded")
    audit(db, user, "correction_reason", purchase, {"reason": reason})
    return purchase_data(db, user, purchase)


@router.post("/purchases/{identifier}/cancel", response_model=PurchaseOut)
def cancel_purchase(
    identifier: str,
    body: Reason,
    request: Request,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    return idempotent(
        db,
        user,
        request,
        body.model_dump(),
        lambda: correct_purchase(db, user, identifier, body.reason, False),
    )


@router.post("/purchases/{identifier}/refund", response_model=PurchaseOut)
def refund_purchase(
    identifier: str,
    body: Reason,
    request: Request,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    return idempotent(
        db,
        user,
        request,
        body.model_dump(),
        lambda: correct_purchase(db, user, identifier, body.reason, True),
    )


def report_data(db, user, start, end, basis):
    if start > end or (end - start).days > 3660:
        problem(422, "Intervalo financeiro inválido")
    income = expenses = 0
    categories = {
        str(r.id): {"category_id": str(r.id), "name": r.data["name"], "amount": 0}
        for r in rows(db, user, "category")
    }
    for row in ledger_rows(db, user):
        d = row.data
        if (
            d["status"] == "planned"
            or d["transfer_id"]
            or not start.isoformat() <= d["date"] <= end.isoformat()
            or (basis == "accrual" and d["invoice_id"])
        ):
            continue
        if d["reversal_of"]:
            original = owned(db, user, "transaction", d["reversal_of"])
            if original.data["transaction_kind"] == "income":
                income -= d["amount"]
            else:
                expenses -= d["amount"]
                if d["category_id"] in categories:
                    categories[d["category_id"]]["amount"] -= d["amount"]
        elif d["transaction_kind"] == "income":
            income += d["amount"]
        else:
            expenses += d["amount"]
            if d["category_id"] in categories:
                categories[d["category_id"]]["amount"] += d["amount"]
    if basis == "accrual":
        purchases = {str(p.id): p for p in rows(db, user, "purchase")}
        for item in rows(db, user, "installment"):
            d = item.data
            purchase = purchases[d["purchase_id"]]
            if (
                purchase.data["status"] == "cancelled"
                or not start.isoformat() <= d["close_date"] <= end.isoformat()
            ):
                continue
            expenses += d["amount"]
            if purchase.data["category_id"] in categories:
                categories[purchase.data["category_id"]]["amount"] += d["amount"]
    return {
        "income": income,
        "expenses": expenses,
        "net": income - expenses,
        "categories": [x for x in categories.values() if x["amount"]],
        "basis": basis,
    }


@router.get("/finance/report", response_model=FinanceReport)
def report(
    from_date: date | None = None,
    to_date: date | None = None,
    basis: Literal["cash", "accrual"] = "cash",
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    now = today(user)
    return report_data(
        db,
        user,
        from_date or now.replace(day=1),
        to_date or add_months(now.replace(day=1), 1) - timedelta(days=1),
        basis,
    )
