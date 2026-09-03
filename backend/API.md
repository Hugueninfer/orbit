# Orbit HTTP API contract

Base `/api/v1`; JSON snake_case; dates ISO YYYY-MM-DD, timestamps UTC ISO; IDs UUID strings; integer money in minor currency units. Every route except config, health, auth/demo, Telegram webhook requires `Authorization: Bearer <access_token>`. Collections return arrays. Creation returns an object (201). PATCH returns object and requires current `version`. Errors RFC9457 `application/problem+json` with `type,title,status,detail`. Unknown and foreign-owned IDs both return 404. Stale versions return 409. Fields marked `?` are optional; null allowed only where stated. Default arrays empty. Responses include all listed fields. DELETE archives where noted and returns `{ok:true}`.

## Identity
- GET `/config` -> `{app_mode:"demo"|"personal",oidc_authority:string,oidc_client_id:string,oidc_audience:string}`
- GET `/health` -> `{status:"ok",database:"ok"}`
- POST `/auth/demo` body `{}` -> `{access_token,expires_at}`. Independent seeded tenant, 24h expiry. Demo only.
- POST `/auth/demo/reset` body `{}` -> `{ok:true}` resets only authenticated demo owner.
- GET `/me`; PATCH `/me` `{version,name?,timezone?,currency?,locale?,week_start?,weight_unit?}` -> `{id,name,timezone,currency,locale,week_start:0..6,weight_unit:"kg"|"lb",version,is_demo}`.

## Tasks
- GET/POST `/task-lists`; PATCH `/task-lists/{id}`. Create `{name,color?:"#8b5cf6"}`; patch `{version,name?,color?,archived?}`. Response `{id,name,color,position,archived,version}`. Inbox is seeded.
- GET `/tasks` filters `list_id,status,priority,tag,due_from,due_to,archived=false`; POST `/tasks`; GET/PATCH `/tasks/{id}`; DELETE `/tasks/{id}` archives.
- Create task `{title,list_id,description?:"",priority?:"none",due_date?:null,start_date?:null,estimate_minutes?:null,tags?:[],checklist?:[]}`; patch `{version,...editable_create_fields,status?,position?,archived?}`. Response `{id,list_id,title,description,status:"todo"|"in_progress"|"done"|"cancelled",priority:"none"|"low"|"medium"|"high",due_date,start_date,estimate_minutes,tags:string[],checklist:[{id:string,text,done:boolean}],position,archived,completed_at:null|timestamp,version,is_overdue}`.
- POST `/tasks/reorder` `{list_id,items:[{id,version}]}` -> task array. Must contain all nonarchived tasks from that list, each once.

## Habits
- GET/POST `/habits`; GET/PATCH `/habits/{id}`. Create `{name,description?:"",color?:"#8b5cf6",target_quantity?:1,unit?:"vezes",schedule?:{kind:"daily",weekdays:[],times_per_week:1}}`; schedule kind daily/weekdays/times_per_week, weekdays Monday=0; weekly target 1..7. Patch `{version,name?,description?,color?,target_quantity?,unit?,schedule?,archived?}`. New schedule effective tomorrow in owner timezone.
- Response `{id,name,description,color,target_quantity,unit,schedule,archived,version,created_date}`.
- PUT `/habits/{id}/checkins/{date}` `{quantity:positive_integer,note?:""}` -> `{id,habit_id,date,quantity,note}`; DELETE same -> `{ok:true}`. No future check-in.
- GET `/habits/{id}/stats?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD` -> `{current_streak,best_streak,streak_unit:"days"|"weeks",adherence:number,completed,total,calendar:[{date,scheduled,quantity,target,completed}],checkins:[{id,habit_id,date,quantity,note}]}`. Default last 30 days. GET `/habits/{id}/checkins` returns all checkins.

## Finance
- GET/POST `/accounts`; PATCH `/accounts/{id}`. Create `{name,type?:"checking",currency?:"BRL",opening_balance?:0,color?:"#8b5cf6"}`; patch `{version,name?,color?,archived?}`. Response `{id,name,type,currency,opening_balance,color,archived,version,current_balance,projected_balance}`; type checking/savings/cash.
- GET/POST `/categories`; PATCH `/categories/{id}`. Create `{name,kind:"income"|"expense",color?:"#8b5cf6"}`; patch `{version,name?,color?,archived?}` -> `{id,name,kind,color,archived,version}`.
- GET `/transactions` filters `account_id,kind,status,from_date,to_date`; POST `/transactions`; PATCH `/transactions/{id}`. Create `{account_id,category_id?:null,kind:"income"|"expense",amount:positive_integer,currency?:"BRL",description,date,status?:"posted"}`. Patch `{version,account_id?,category_id?,amount?,description?,date?,status?}` only planned records; posted cancellation requires reversal below. Response `{id,account_id,category_id,kind,amount,currency,description,date,status:"planned"|"posted"|"cancelled",version,transfer_id:null|uuid,invoice_id:null|uuid,is_overdue}`.
- POST `/transactions/{id}/reverse` `{reason}` + `Idempotency-Key` -> original object with status cancelled plus compensating posted ledger entry (audit retained).
- POST `/transfers` `{from_account_id,to_account_id,amount,date,description?:"Transferência"}` + `Idempotency-Key` -> `{id,from_account_id,to_account_id,amount,currency,date}`. Atomic posted ledger legs; same currency.
- GET/POST `/recurrences`; PATCH `/recurrences/{id}`. Create `{account_id,category_id?:null,kind,amount,currency?:"BRL",description,start_date,day_of_month:1..31}`; patch `{version,active?,amount?,description?}` -> `{id,...create_fields,active,version}`.
- POST `/recurrences/generate` `{through_date}` -> `{created:number}` (bounded 366-day horizon, unique occurrence per recurrence/date). Also `python -m app.jobs extend-recurrences --through YYYY-MM-DD`.
- GET `/finance/report?from_date=...&to_date=...&basis=cash|accrual` -> `{income,expenses,net,categories:[{category_id,name,amount}],basis}`.

## Cards
- GET/POST `/cards`; PATCH `/cards/{id}`. Create `{name,last_four?:"0000",currency?:"BRL",close_day:1..31,due_day:1..31,limit_amount?:null,payment_account_id?:null,color?:"#8b5cf6"}`. Patch `{version,name?,last_four?,limit_amount?,payment_account_id?,color?,archived?}`. Response `{id,...create_fields,archived,version}`.
- POST `/cards/{id}/preview` `{amount,installment_count,purchase_date}` -> `{total,installments:[{number,amount,close_date,due_date}]}`.
- GET `/purchases`; POST `/purchases` `{card_id,category_id?:null,description,amount,installment_count,purchase_date}` + `Idempotency-Key` -> `{id,card_id,category_id,description,amount,installment_count,purchase_date,status:"active"|"cancelled"|"refunded",version,installments:[{id,invoice_id,number,amount,close_date,due_date}]}`.
- POST `/purchases/{id}/cancel` `{reason}` + `Idempotency-Key` -> purchase; only before all relevant cycles close. POST `/purchases/{id}/refund` `{reason}` + `Idempotency-Key` -> purchase; credits in next open invoice, preserves original closed installments.
- GET `/invoices?card_id=...`; GET `/invoices/{id}` -> `{id,card_id,close_date,due_date,total,paid,remaining,status:"open"|"closed"|"partial"|"paid"|"overdue",version,items:[{id,purchase_id,description,number,amount}],payments:[{id,account_id,amount,date}]}`.
- POST `/invoices/{id}/payments` `{account_id,amount,date}` + `Idempotency-Key` -> invoice. Reject excess/foreign-currency payment; account expense ledger entry linked to invoice, excluded from accrual report.

## Workouts
- GET/POST `/exercises`; PATCH `/exercises/{id}`. Create `{name,muscle_group,equipment?:"",instructions?:""}`; patch `{version,name?,muscle_group?,equipment?,instructions?,archived?}` -> `{id,name,muscle_group,equipment,instructions,is_global,archived,version}`. Global exercises read-only.
- GET/POST `/routines`; GET/PATCH `/routines/{id}`. Create `{name,description?:"",exercises:[{exercise_id,sets:1..20,reps:1..100,load?:"0",rest_seconds?:90}]}`; patch `{version,name?,description?,exercises?,archived?}` -> `{id,name,description,exercises:[{exercise_id,name,muscle_group,sets,reps,load,rest_seconds}],archived,version}`. Decimal loads serialized as strings.
- GET `/sessions?status=active|finished|cancelled`; GET `/sessions/active` -> session or null; POST `/sessions` `{routine_id,copy_last?:false}` + `Idempotency-Key`; GET `/sessions/{id}`. Response `{id,routine_id,name,status,started_at,finished_at:null|timestamp,notes,version,volume:string,pr_count,exercises:[{exercise_id,name,muscle_group,rest_seconds,sets:[{id,position,load:string,reps,type:"normal"|"warmup"|"drop"|"failure",rpe:null|number,rir:null|number,completed_at:null|timestamp,is_pr}]}],rest_until:null|timestamp}`.
- PUT `/sessions/{id}/sets/{set_id}` `{version,load:string,reps,type?:"normal",rpe?:null,rir?:null,completed?:true,reason?:""}` -> session. Edits after finish require reason. Logs audit, recomputes volume/PR.
- POST `/sessions/{id}/finish` `{version,notes?:""}` -> session; >=1 completed set. POST `/sessions/{id}/cancel` `{version}` -> session. POST `/sessions/{id}/copy-last` `{version}` -> session, explicit copy with timestamps cleared; active only.

## Dashboard / integration
- GET `/dashboard?basis=cash|accrual` -> `{today,profile,tasks,habits:[habit+{stats}],accounts,cards,invoices,active_session,last_session,monthly:{income,expenses,net,categories,basis},workout_count,suggested_routine:null|routine}`. All real owner-scoped data.
- GET `/integrations/telegram` -> `{enabled,linked,provider_mode:"disabled"|"fixture"|"live",status}`. POST `/integrations/telegram/link` -> `{code,expires_at}`; DELETE same unlinks.
- POST `/integrations/telegram/simulate` `{text}` -> durable `{id,status,mode:"fixture",result}`; demo only, text deterministic JSON expense fields (never represents real AI).
- POST `/integrations/telegram/webhook` accepts Telegram update; secret header required, private chat only, update_id deduplicated; durable inbox/outbox. Live audio requires configured provider and worker, otherwise explicit disabled reply. No silently enabled provider.
- GET `/audit` -> latest 100 `{id,action,entity_type,entity_id,created_at,detail}`.

Sensitive financial commands and session creation require `Idempotency-Key` (8–128 chars). Same key+body replays response; different body returns 409. Demo tenants limited to 5,000 data rows, 100 active sessions globally; expired tenants removed by demo creation and `python -m app.jobs cleanup-demo`. OIDC personal identity is keyed by issuer + subject; no passwords stored.

Additional workout command: POST `/sessions/{id}/sets` `{version,exercise_id,load:"0",reps,type?:"normal"}` -> updated session. Adds an uncompleted set to an existing snapshot exercise in an active session (maximum 30 sets per exercise).

## Operational and accounting clarifications
- POST `/transactions` also requires `Idempotency-Key`, as do card purchases, transfers, invoice payments and session creation.
- GET `/health/live` -> `{status:"ok"}` is process liveness; GET `/api/v1/health` also checks PostgreSQL readiness.
- Invoice responses additionally include `credit_brought_forward` (positive integer credit applied from earlier cycles). `total` is the cycle's obligations after this credit; negative credit remains available for later cycles. Original installments and closed-cycle history remain intact.
- The core supports one currency per user. Account/card currency must match the profile. Currency cannot change after accounts exist; this prevents consolidated totals from mixing currencies.
- Calendar query `to_date` must be <= today in the profile timezone. Schedule-mode changes start a new current streak; historical daily and weekly adherence uses the applicable historical mode. Initial partial weeks cap the target to available days.
- OIDC uses standard issuer discovery (`/.well-known/openid-configuration`) with exact returned issuer validation. `OIDC_JWKS_URL` overrides discovery for internal Docker routing or another trusted explicit JWKS location.
- Transaction reversals preserve the original ledger entry, record an opposite entry and audit reason, mark the original cancelled in the UI, and net against its original income/expense category in reports. Transfers never inflate consolidated income/expenses. Invoice payments affect cash only; installments affect accrual only.
- Accrual recognition is per installment close date. Reports default to the current calendar month. Historical correction reasons are mandatory after workout completion.

## Optional Telegram milestone status
Implemented: one-use 10-minute link codes, private-chat webhook authentication, durable update deduplication/inbox, atomic expense/purchase recording through the domain services, explicit fixture simulation, configurable HTTP extraction provider port, memory-only temporary audio handling, minimal payload retention, durable outbox with five delivery attempts, and a one-shot worker (`python -m app.jobs telegram-worker`). Missing provider configuration is explicit disabled status. Worker scheduling is an operational responsibility.

Not release-validated: live Telegram credentials/provider calls; multi-message clarification/resumption; inline receipt edit/undo/open buttons; user alias/default-resolution configuration; robust exponential retry scheduling/dead-letter recovery and configurable transcription-retention policies. The current reply directs users to the Orbit UI for correction. Delivery is at-least-once (a transport acknowledgement loss can repeat a receipt; it cannot duplicate the financial record). This is an optional integration foundation, not a completed M10 audio product.
