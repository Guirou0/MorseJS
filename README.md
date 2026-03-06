# MorseJS - Sistema Morse STM32

Interface desktop para conversao Texto <-> Morse, comunicacao serial e monitoramento em tempo real para projetos STM32. Construido com Electron + React.

## Recursos

- Conversao bidirecional Texto <-> Morse
- Envio de mensagens para STM32 via porta serial
- Recepcao e traducao automatica (opcional)
- Monitor serial com timestamps e auto scroll
- Logs exportaveis

## Tecnologias

- Electron + Vite
- React + React Bootstrap
- SerialPort (Node)

## Requisitos

- Node.js LTS
- npm

### Linux: permissao de acesso serial

Para acessar portas seriais, o usuario precisa estar no grupo `dialout` (ou `uucp` em algumas distros):

```bash
sudo usermod -aG dialout $USER
```

Depois disso, faca logout/login.

## Como rodar

### Instalar dependencias

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

### Build

```bash
# Windows
npm run build:win

# Linux
npm run build:linux
```

## Uso rapido

1. Conecte o STM32 via USB.
2. Abra o app e selecione a porta serial (ex.: `/dev/ttyACM0` ou `COM3`).
3. Conecte e envie mensagens em Morse.
4. Acompanhe o monitor serial para debug e historico.

## Problemas comuns

- **Sem portas listadas no Linux**: verifique as permissoes de grupo e se o cabo/driver esta correto.
- **Falha ao conectar**: confirme baud rate e se a porta nao esta em uso por outro processo.


