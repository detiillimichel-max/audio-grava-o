# 🎙️ Gravador de Áudio

Um gravador de áudio minimalista e funcional feito com HTML, CSS e JavaScript puro (vanilla). Totalmente client-side, sem necessidade de servidor ou internet após o carregamento.

## ✨ Funcionalidades

- 🎤 **Gravação** com o microfone (via `MediaRecorder API`).
- ▶️ **Reprodução** dos áudios diretamente no navegador.
- ✏️ **Renomeação** (clique no nome da gravação).
- 🗑️ **Exclusão** de gravações indesejadas.
- 💾 **Persistência local** – todas as gravações são salvas no `localStorage` do navegador e permanecem mesmo após fechar a página.
- 📅 **Agrupamento por mês/ano**, exatamente como na interface nativa do iOS/Android.
- 📱 **Design responsivo** e adaptado para mobile.

## 🖼️ Interface

A interface foi inspirada no aplicativo de gravações do sistema, com:
- Lista organizada por meses.
- Exibição de duração (MM:SS) e data.
- Botão flutuante (FAB) para iniciar/parar a gravação.
- Modal para nomear a gravação ao finalizar.

## 🛠️ Tecnologias utilizadas

- HTML5
- CSS3 (com animações e variáveis)
- JavaScript (ES6+)
- Web APIs: `MediaRecorder`, `getUserMedia`, `localStorage`, `Audio`

## 🚀 Como usar

1. Acesse a URL abaixo : https://detiillimichel-max.github.io/audio-grava-o/
   Feito com carinho com ajuda do Deep 
