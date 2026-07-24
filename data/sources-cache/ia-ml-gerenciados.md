# Serviços de IA/ML Gerenciados — notas verificadas

Recuperado em 2026-06-29. Foco SAA-C03 (questões "qual serviço de IA usar"). São serviços de alto nível, sem precisar treinar modelo.

## Visão / Imagem
- **Amazon Rekognition**: análise de **imagem e vídeo** — detecção de objetos/cenas, **rostos**, **moderação de conteúdo** (impróprio), reconhecimento de celebridades, texto EM imagens. Caso: moderar fotos enviadas por usuários, busca por rosto.

## Documentos / OCR
- **Amazon Textract**: **OCR + extração de dados** de documentos escaneados/PDFs — texto, manuscrito, e principalmente **campos de formulários e tabelas** (vai além do OCR simples). Caso: digitalizar faturas, formulários, contratos.

## Texto / NLP
- **Amazon Comprehend**: **NLP** — análise de **sentimento**, entidades, frases-chave, idioma e tópicos de texto não estruturado. Caso: medir sentimento de reviews, classificar documentos. (Comprehend Medical pra texto clínico.)

## Voz
- **Amazon Transcribe**: **fala → texto** (speech-to-text / ASR). Caso: legendar áudio, transcrever call center.
- **Amazon Polly**: **texto → fala** (text-to-speech), vozes realistas. Caso: leitor de conteúdo, IVR.

## Idioma
- **Amazon Translate**: **tradução automática neural** entre idiomas. Caso: traduzir conteúdo/app pra vários idiomas.

## Conversa
- **Amazon Lex**: construir **chatbots / interfaces de conversa** (voz e texto), mesmo motor da Alexa (reconhecimento de fala + entendimento de linguagem). Caso: assistente virtual, bot de atendimento.

## ML customizado
- **Amazon SageMaker**: plataforma pra **construir, treinar e implantar modelos de ML próprios** (mais baixo nível, mais customização). Use quando os serviços prontos acima NÃO atendem e você precisa de um modelo sob medida.

## Combinações clássicas (prova)
- **Transcribe → Translate → Polly**: transcreve a fala, traduz, e fala no outro idioma (tradução de voz).
- **Lex + Polly**: chatbot que conversa nos dois sentidos (entende e responde falando).
- **Textract → Comprehend**: extrai texto do documento e analisa sentimento/entidades.

## Regra de escolha
- Imagem/vídeo = Rekognition; documento/formulário (OCR) = Textract; sentimento/NLP de texto = Comprehend; fala→texto = Transcribe; texto→fala = Polly; tradução = Translate; chatbot = Lex; modelo ML próprio = SageMaker.
- Fontes: https://aws.amazon.com/textract/ · https://aws.amazon.com/polly/ · https://aws.amazon.com/lex/faqs/ · https://docs.aws.amazon.com/decision-guides/latest/machine-learning-on-aws-how-to-choose/guide.html
