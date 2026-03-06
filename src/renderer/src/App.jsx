import { useEffect, useState } from 'react'
import { Card, Col, Container, Form, InputGroup, Row } from 'react-bootstrap'
import { Copy, Download, Plug, RefreshCw, Send, Trash2, Unplug } from 'lucide-react'

const MORSE_CODE = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  1: '.----',
  2: '..---',
  3: '...--',
  4: '....-',
  5: '.....',
  6: '-....',
  7: '--...',
  8: '---..',
  9: '----.',
  0: '-----',
  ' ': '/'
}

const REVERSE_MORSE = Object.entries(MORSE_CODE).reduce((acc, [key, value]) => {
  acc[value] = key
  return acc
}, {})

const textToMorse = (text) =>
  text
    .toUpperCase()
    .split('')
    .map((char) => MORSE_CODE[char] || '')
    .join(' ')
    .trim()

const morseToText = (morse) => {
  const words = morse.split(' / ')
  const decoded = []
  words.forEach((word) => {
    word.split(' ').forEach((letter) => {
      decoded.push(REVERSE_MORSE[letter] || '')
    })
    decoded.push(' ')
  })
  return decoded.join('').trim()
}

const App = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [ports, setPorts] = useState([])
  const [selectedPort, setSelectedPort] = useState('')
  const [baudRate, setBaudRate] = useState('115200')
  const [txText, setTxText] = useState('')
  const [txMorse, setTxMorse] = useState('')
  const [rxMorse, setRxMorse] = useState('')
  const [rxText, setRxText] = useState('')
  const [autoTranslate, setAutoTranslate] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [serialLog, setSerialLog] = useState([])
  const [statusMessage, setStatusMessage] = useState(() => {
    return !window.morseApi ? 'API Electron nao encontrada.' : 'Desconectado'
  })

  const receivedMessage = autoTranslate ? rxText : rxMorse

  useEffect(() => {
    if (!window.morseApi) {
      return undefined
    }

    const unsubscribeData = window.morseApi.onData((data) => {
      setRxMorse(data)
      if (autoTranslate) {
        setRxText(morseToText(data))
      }
      const time = new Date().toLocaleTimeString('pt-BR')
      const line = showTimestamps ? `[${time}] RX: ${data}` : `RX: ${data}`
      setSerialLog((prev) => [...prev, line].slice(-500))
    })

    const unsubscribeStatus = window.morseApi.onStatus((status) => {
      if (status.connected) {
        setIsConnected(true)
        setStatusMessage(`Conectado: ${status.port} @ ${status.baudRate} bps`)
      } else {
        setIsConnected(false)
        setStatusMessage(status.message || 'Desconectado')
      }
    })

    const unsubscribePorts = window.morseApi.onPorts((list) => {
      setPorts(list || [])
      if (!selectedPort && list && list.length > 0) {
        setSelectedPort(list[0].path)
      }
    })

    window.morseApi.listPorts()

    return () => {
      unsubscribeData()
      unsubscribeStatus()
      unsubscribePorts()
    }
  }, [autoTranslate, selectedPort, showTimestamps])

  const refreshPorts = async () => {
    if (window.morseApi) {
      const list = await window.morseApi.listPorts()
      setPorts(list || [])
      if (!selectedPort && list && list.length > 0) {
        setSelectedPort(list[0].path)
      }
    }
  }

  const handleConnect = async () => {
    if (!window.morseApi) {
      return
    }
    if (isConnected) {
      await window.morseApi.disconnect()
      return
    }
    if (!selectedPort) {
      setStatusMessage('Selecione uma porta.')
      return
    }
    const response = await window.morseApi.connect(selectedPort, Number(baudRate))
    if (!response.ok) {
      setStatusMessage(response.message || 'Falha ao conectar.')
    }
  }

  const handleSend = async () => {
    if (!window.morseApi || !txMorse) {
      return
    }
    const response = await window.morseApi.send(txMorse)
    if (!response.ok) {
      setStatusMessage(response.message || 'Falha ao enviar.')
      return
    }
    const time = new Date().toLocaleTimeString('pt-BR')
    const line = showTimestamps ? `[${time}] TX: ${txMorse}` : `TX: ${txMorse}`
    setSerialLog((prev) => [...prev, line].slice(-500))
  }

  const handleConvertToMorse = () => {
    setTxMorse(textToMorse(txText))
  }

  const handleConvertToText = () => {
    setTxText(morseToText(txMorse))
  }

  const clearLog = () => setSerialLog([])

  const clearInput = () => setTxText('')
  const clearOutput = () => setTxMorse('')
  const clearReceived = () => {
    setRxMorse('')
    setRxText('')
  }

  const saveMonitor = () => {
    if (!serialLog.length) {
      return
    }
    const content = serialLog.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `morse-monitor-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-')}.log`
    link.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = (value) => {
    if (navigator.clipboard && value) {
      navigator.clipboard.writeText(value)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-title">
          <div className="app-title">SISTEMA MORSE STM32</div>
          <div className="app-subtitle">Conversao e monitor serial</div>
        </div>

        <div className="topbar-actions">
          <button className="action-btn" onClick={clearInput} type="button">
            <Trash2 size={14} /> Limpar entrada
          </button>
          <button className="action-btn" onClick={clearOutput} type="button">
            <Trash2 size={14} /> Limpar saida
          </button>
          <button className="action-btn" onClick={clearReceived} type="button">
            <Trash2 size={14} /> Limpar recebido
          </button>
          <button className="action-btn" onClick={clearLog} type="button">
            <Trash2 size={14} /> Limpar monitor
          </button>
          <button className="action-btn" onClick={saveMonitor} type="button">
            <Download size={14} /> Salvar monitor
          </button>
        </div>

        <div className="topbar-toggles">
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(event) => setAutoTranslate(event.target.checked)}
            />
            <span className="toggle-track" />
            <span className="toggle-text">Auto traduzir</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={showTimestamps}
              onChange={(event) => setShowTimestamps(event.target.checked)}
            />
            <span className="toggle-track" />
            <span className="toggle-text">Timestamps</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(event) => setAutoScroll(event.target.checked)}
            />
            <span className="toggle-track" />
            <span className="toggle-text">Auto scroll</span>
          </label>
        </div>
      </header>

      <Container fluid className="content-area" data-bs-theme="dark">
        <Row className="g-3">
          <Col lg={6} className="d-flex flex-column">
            <Card className="panel panel-amber h-100">
              <Card.Header className="panel-header">Mensagem para transmitir</Card.Header>
              <Card.Body className="panel-body">
                <Form.Control
                  as="textarea"
                  className="panel-textarea"
                  placeholder="Digite o texto aqui..."
                  value={txText}
                  onChange={(event) => setTxText(event.target.value)}
                />
                <div className="panel-controls">
                  <button className="ghost-btn" onClick={handleConvertToMorse} type="button">
                    Texto → Morse
                  </button>
                  <button className="ghost-btn" onClick={handleConvertToText} type="button">
                    Morse → Texto
                  </button>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(txMorse)}
                    type="button"
                  >
                    <Copy size={14} /> Copiar
                  </button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} className="d-flex flex-column">
            <Card className="panel panel-blue h-100">
              <Card.Header className="panel-header">Resultado da conversao</Card.Header>
              <Card.Body className="panel-body">
                <Form.Control
                  as="textarea"
                  className="panel-textarea"
                  placeholder="Resultado da conversao"
                  value={txMorse}
                  readOnly
                />
                <div className="panel-controls end">
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(txMorse)}
                    type="button"
                  >
                    <Copy size={14} /> Copiar
                  </button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div className="serial-config">
          <div className="serial-title">Configuracao serial</div>
          <InputGroup className="serial-input">
            <Form.Select
              value={selectedPort}
              onChange={(event) => setSelectedPort(event.target.value)}
            >
              {ports.length === 0 && <option>Sem portas</option>}
              {ports.map((port) => (
                <option key={port.path} value={port.path}>
                  {port.path}
                </option>
              ))}
            </Form.Select>
            <button className="icon-btn" onClick={refreshPorts} type="button">
              <RefreshCw size={14} />
            </button>
          </InputGroup>

          <InputGroup className="serial-input baud">
            <InputGroup.Text>Baud</InputGroup.Text>
            <Form.Select value={baudRate} onChange={(event) => setBaudRate(event.target.value)}>
              <option>9600</option>
              <option>57600</option>
              <option>115200</option>
            </Form.Select>
          </InputGroup>

          <div className="serial-actions">
            <button
              className="connect-btn"
              onClick={handleConnect}
              disabled={isConnected}
              type="button"
            >
              <Plug size={14} /> Conectar
            </button>
            <button
              className="disconnect-btn"
              onClick={handleConnect}
              disabled={!isConnected}
              type="button"
            >
              <Unplug size={14} /> Desconectar
            </button>
            <button className="send-btn" onClick={handleSend} disabled={!isConnected} type="button">
              <Send size={14} /> Enviar para STM
            </button>
          </div>

          <div className="serial-status">
            <span className={`status-dot ${isConnected ? 'on' : ''}`} />
            <span className="status-text">{statusMessage}</span>
          </div>
        </div>

        <Row className="g-3">
          <Col lg={4} className="d-flex flex-column">
            <Card className="panel panel-blue h-100">
              <Card.Header className="panel-header">Mensagem recebida do STM32</Card.Header>
              <Card.Body className="panel-body">
                <Form.Control
                  as="textarea"
                  className="panel-textarea"
                  placeholder="Aguardando mensagem..."
                  value={receivedMessage}
                  readOnly
                />
                <div className="panel-controls end">
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(receivedMessage)}
                    type="button"
                  >
                    <Copy size={14} /> Copiar
                  </button>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={8} className="d-flex flex-column">
            <Card className="panel panel-amber h-100">
              <Card.Header className="panel-header">Log e monitor serial</Card.Header>
              <Card.Body className="panel-body">
                <div className="panel-controls">
                  <button className="ghost-btn" onClick={clearLog} type="button">
                    <Trash2 size={14} /> Limpar monitor
                  </button>
                  <button className="ghost-btn" onClick={saveMonitor} type="button">
                    <Download size={14} /> Salvar monitor
                  </button>
                  <div className="toggle-group">
                    <label className="toggle small">
                      <input
                        type="checkbox"
                        checked={autoTranslate}
                        onChange={(event) => setAutoTranslate(event.target.checked)}
                      />
                      <span className="toggle-track" />
                      <span className="toggle-text">Auto traduzir</span>
                    </label>
                    <label className="toggle small">
                      <input
                        type="checkbox"
                        checked={showTimestamps}
                        onChange={(event) => setShowTimestamps(event.target.checked)}
                      />
                      <span className="toggle-track" />
                      <span className="toggle-text">Timestamps</span>
                    </label>
                    <label className="toggle small">
                      <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(event) => setAutoScroll(event.target.checked)}
                      />
                      <span className="toggle-track" />
                      <span className="toggle-text">Auto scroll</span>
                    </label>
                  </div>
                </div>

                <div
                  className="monitor-surface"
                  ref={(node) => {
                    if (node && autoScroll) {
                      node.scrollTop = node.scrollHeight
                    }
                  }}
                >
                  {serialLog.length === 0 && (
                    <div className="empty-state">Nenhum dado serial ainda.</div>
                  )}
                  {serialLog.map((line, index) => (
                    <div key={`${line}-${index}`}>{line}</div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default App
