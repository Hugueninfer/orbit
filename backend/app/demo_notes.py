"""Fictional, portfolio-friendly notes included only in the prepared demo base."""

from datetime import timedelta

from .clock import clock
from .note_document import plain_text, validate_document
from .store import add


def paragraph(text, *marks):
    node = {"type": "text", "text": text}
    if marks:
        node["marks"] = [{"type": mark} for mark in marks]
    return {"type": "paragraph", "content": [node]}


def heading(text):
    return {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": text}]}


def checklist(*items):
    return {
        "type": "taskList",
        "content": [
            {"type": "taskItem", "attrs": {"checked": done}, "content": [paragraph(text)]}
            for text, done in items
        ],
    }


def seed_notes(db, user, day):
    folders = {
        name: add(db, user, "note_folder", {"name": name, "color": color}).id
        for name, color in [
            ("Trabalho", "#7692ff"),
            ("Vida", "#38d9c5"),
            ("Mercado", "#f7c66d"),
            ("Relacionamento", "#ea8dba"),
            ("Viagens", "#ac96ee"),
        ]
    }
    examples = [
        (
            "Trabalho",
            "Reunião que poderia ter sido uma nota",
            None,
            False,
            [
                heading("Plano para uma semana com menos abas abertas"),
                paragraph("Objetivo: terminar uma coisa antes de começar outras sete. Ambicioso, eu sei."),
                checklist(
                    ("Revisar as prioridades da semana", True),
                    ("Entregar a primeira versão do projeto", False),
                    ("Reservar um horário sem reuniões para desenvolver", False),
                ),
                paragraph("Lembrete: café ajuda, mas não substitui requisitos claros.", "italic"),
            ],
        ),
        (
            "Vida",
            "Manual de sobrevivência da vida adulta",
            None,
            False,
            [
                heading("Pequenas vitórias também contam"),
                paragraph(
                    "Beber água, dormir em um horário razoável e lembrar de tirar a roupa da máquina antes de lavar tudo de novo."
                ),
                checklist(
                    ("Regar a planta que ainda acredita em mim", True),
                    ("Marcar aquela consulta que estou adiando", False),
                    ("Ler algumas páginas longe do celular", False),
                ),
            ],
        ),
        (
            "Mercado",
            "Lista de compras — missão geladeira cheia",
            None,
            False,
            [
                heading("Comprar comida de verdade"),
                checklist(
                    ("Arroz e feijão", True),
                    ("Ovos", False),
                    ("Banana, maçã e verduras", False),
                    ("Café — item de infraestrutura crítica", False),
                    ("Chocolate para situações de emergência", False),
                ),
                paragraph(
                    "Regra da missão: não ir ao mercado com fome. A última vez terminou com três pizzas e nenhum detergente.",
                    "italic",
                ),
            ],
        ),
        (
            "Viagens",
            "Próxima parada: um lugar sem despertador",
            None,
            False,
            [
                heading("Ideias para a próxima viagem"),
                paragraph(
                    "Um fim de semana na serra, um café com vista bonita e um roteiro com espaço para se perder um pouco."
                ),
                checklist(
                    ("Pesquisar hospedagens", True),
                    ("Comparar transporte e orçamento", False),
                    ("Separar uma playlist para a estrada", False),
                    ("Lembrar do carregador antes de sair", False),
                ),
                paragraph("Prioridade absoluta: provar a comida local. Museus também, mas depois do almoço."),
            ],
        ),
        (
            "Relacionamento",
            "Um encontro sem olhar o celular",
            3,
            False,
            [
                heading("Hoje o melhor plano foi o mais simples"),
                paragraph(
                    "Fizemos um jantar em casa. A receita dizia 30 minutos; duas horas depois, estávamos rindo e pedindo pizza."
                ),
                paragraph(
                    "Conclusão: o jantar não ganhou estrela Michelin, mas a companhia ganhou todas.", "bold"
                ),
                checklist(
                    ("Escolher um filme juntos", True),
                    ("Planejar um piquenique para o próximo fim de semana", False),
                ),
            ],
        ),
        (
            "Viagens",
            "Diário de bordo: perdi o ônibus, achei uma história",
            2,
            False,
            [
                heading("Nem todo desvio dá errado"),
                paragraph(
                    "Perdi o ônibus por dois minutos. Enquanto esperava o próximo, descobri uma padaria com o melhor pão de queijo da viagem."
                ),
                paragraph("Atualização do roteiro: incluir mais intervalos para imprevistos comestíveis."),
            ],
        ),
        (
            "Vida",
            "Hoje o dia como Homem-Aranha foi muito difícil",
            1,
            False,
            [
                heading("Grandes poderes, muitas coisas para resolver"),
                paragraph(
                    "Hoje o dia como Homem-Aranha foi muito difícil. Salvei a cidade, ajudei um gato a descer da árvore e ainda cheguei atrasado na reunião das nove."
                ),
                paragraph("O vilão do dia não era o Duende Verde. Era um boleto que venceu ontem.", "bold"),
                {
                    "type": "blockquote",
                    "content": [
                        paragraph(
                            "Com grandes poderes vêm grandes responsabilidades… e uma pilha de roupa para lavar."
                        )
                    ],
                },
                checklist(
                    ("Salvar a vizinhança", True),
                    ("Consertar o lançador de teia", False),
                    ("Comprar pão antes de voltar para casa", False),
                ),
                paragraph(
                    "Amanhã tento equilibrar melhor a vida pessoal e a vida de super-herói. Hoje, só quero dormir.",
                    "italic",
                ),
            ],
        ),
        (
            "Trabalho",
            "Eu com certeza vou contratar esse cara",
            0,
            True,
            [
                heading("Diário fictício de um recrutador muito impressionado"),
                paragraph(
                    "Entrei aqui só para dar uma olhadinha no portfólio. Agora tenho uma lista de compras organizada, uma viagem planejada e um compromisso emocional com a planta da pasta Vida."
                ),
                paragraph("Eu com certeza vou contratar esse cara.", "bold"),
                {
                    "type": "blockquote",
                    "content": [
                        paragraph("Se ele organiza até a rotina do Homem-Aranha, imagina o nosso backlog.")
                    ],
                },
                checklist(
                    ("Abrir o projeto e explorar a demonstração", True),
                    ("Testar as notas e perceber que salvam sozinhas", True),
                    ("Chamar o desenvolvedor para uma conversa", False),
                ),
                paragraph(
                    "Parecer final: aprovado no teste de organização e no de bom humor. Só falta a entrevista — e talvez um café."
                ),
                paragraph(
                    "Esta entrada é fictícia. A vontade de causar uma boa primeira impressão é real.",
                    "italic",
                ),
            ],
        ),
    ]
    for folder, title, days_ago, favorite, blocks in examples:
        document = validate_document({"type": "doc", "content": blocks})
        add(
            db,
            user,
            "note",
            {
                "title": title,
                "folder_id": folders[folder],
                "journal_date": day - timedelta(days=days_ago) if days_ago is not None else None,
                "favorite": favorite,
                "content": document,
                "plain_text": plain_text(document),
                "deleted_at": None,
                "updated_at": clock.now(),
            },
        )
