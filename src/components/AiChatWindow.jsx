import React, { useRef, useEffect } from 'react';
import { WindowContainer } from './WindowContainer';
import { InlineOrderConfirmCard, CollapsibleExecutedTx } from './ExchangeFeedbackBox';

function formatMessageHtml(text) {
  return String(text || '')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

function getFirstLinePlain(text) {
  return String(text || '')
    .split('\n')[0]
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .slice(0, 95);
}

export function AiChatWindow({
  winMeta,
  isSoloGridWindow,
  activeTradeOrder,
  apiMode,
  aiChatInput,
  chatMessages,
  executedSessionTransactions,
  lastExchangeFeedback,
  collapsedAiTxIds,
  collapsedBubbleIds,
  isConfirmingOrder,
  onSetAiChatInput,
  onSubmitAiChat,
  onConfirmOrder,
  onOpenAiStrategies,
  onToggleAiExecutedTx,
  onToggleAllAiExecutedTx,
  onToggleChatBubble,
  onSetWindowMode,
  onCloseWindow,
  onBringToFront
}) {
  const chatMessagesRef = useRef(null);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  const txListToRender =
    executedSessionTransactions.length > 0
      ? executedSessionTransactions
      : lastExchangeFeedback
      ? [lastExchangeFeedback]
      : [];

  const allTxCollapsed =
    txListToRender.length > 0 &&
    txListToRender.every((fb) => collapsedAiTxIds.has(String(fb.orderId || 'LATEST')));

  const hasInlineContent = Boolean(activeTradeOrder) || txListToRender.length > 0;
  const modeLabel = (apiMode || 'demo').toUpperCase();

  return (
    <WindowContainer
      winMeta={winMeta}
      isSoloGridWindow={isSoloGridWindow}
      baseClassName="panel-card panel-ai-chat"
      titlebarTitle="🤖 Agent AI Handlu OKX Europe"
      extraTitlebarControls={
        <button
          type="button"
          className="win-ctrl-btn btn-titlebar-ai-strategies open-ai-strategies-btn"
          title="Otwórz okno AI Strategies ( możliwości Agenta AI, przykłady zapytań oraz Analiza i Strategia Kupna z OKX )"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAiStrategies();
          }}
        >
          🧠 AI Strategies
        </button>
      }
      onSetWindowMode={onSetWindowMode}
      onCloseWindow={onCloseWindow}
      onBringToFront={onBringToFront}
    >
      <div className="panel-header ai-chat-top-header">
        <div>
          <p className="panel-subtitle">
            Napisz czego chcesz — AI stworzy strategię i przygotuje transakcję do autoryzacji
          </p>
        </div>
        <button
          type="button"
          id="btnOpenAiStrategies"
          className="btn btn-ai-strategies open-ai-strategies-btn"
          title="Otwórz przesuwne okno AI Strategies: sprawdź co potrafi Agent AI, o co można pytać i wygeneruj strategię kupna dla wybranego waloru"
          onClick={onOpenAiStrategies}
        >
          🧠 AI Strategies
        </button>
      </div>

      <form id="aiChatForm" className="chat-input-row" onSubmit={onSubmitAiChat}>
        <input
          type="text"
          id="aiChatInput"
          placeholder="Powiedz AI czego chcesz, np. 'Kup 0.05 BTC za USDC' lub 'Stwórz strategię sprzedaży 5 SOL'..."
          autoComplete="off"
          value={aiChatInput}
          onChange={(e) => onSetAiChatInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Wyślij do AI ➤
        </button>
      </form>

      <div
        id="aiInlineOrderContainer"
        className="ai-inline-order-container"
        hidden={!hasInlineContent}
      >
        {activeTradeOrder && (
          <InlineOrderConfirmCard
            active={activeTradeOrder}
            modeLabel={modeLabel}
            onConfirm={onConfirmOrder}
            isConfirming={isConfirmingOrder}
          />
        )}

        {txListToRender.length > 0 && (
          <div className="ai-executed-tx-list-container">
            <div className="ai-executed-tx-list-toolbar">
              <span>
                ✅{' '}
                <strong>
                  Zrealizowane transakcje w sesji Agenta AI ({txListToRender.length}):
                </strong>
              </span>
              <button
                type="button"
                className="btn btn-collapse-ai-tx toggle-all-ai-tx-btn"
                onClick={onToggleAllAiExecutedTx}
              >
                {allTxCollapsed
                  ? '🔽 Rozwiń wszystkie transakcje'
                  : '🔼 Zwiń zrealizowane transakcje'}
              </button>
            </div>
            {txListToRender.map((fb) => {
              const txKey = String(fb.orderId || 'LATEST');
              return (
                <CollapsibleExecutedTx
                  key={txKey}
                  fb={fb}
                  isCollapsed={collapsedAiTxIds.has(txKey)}
                  onToggle={onToggleAiExecutedTx}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="chat-messages" id="chatMessages" ref={chatMessagesRef}>
        <div className="chat-bubble assistant">
          <div className="bubble-meta">OKX EEA AI Agent</div>
          <div className="bubble-text">
            Wpisz swoje polecenie i naciśnij <strong>Wyślij do AI ➤</strong> — poniżej pojawi
            się pełne zestawienie zlecenia (wraz z prowizją Fee, datą i przeliczeniem na USDC)
            oraz jeden przycisk <strong>Potwierdź</strong> do natychmiastowej realizacji na
            giełdzie. Kliknij klawisz <strong>🧠 AI Strategies</strong> na górze okna, aby
            zobaczyć możliwości Agenta AI i wygenerować pełną analizę oraz strategię kupna z OKX.
          </div>
        </div>

        {chatMessages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          const isCollapsed = collapsedBubbleIds.has(msg.id);
          const firstLinePlain = getFirstLinePlain(msg.text);
          const bubbleClass = [
            'chat-bubble',
            msg.role,
            msg.isExecutedTx ? 'chat-bubble-executed-tx' : '',
            msg.isPendingTx ? 'chat-bubble-pending-tx' : '',
            isCollapsed ? 'is-collapsed-bubble' : ''
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={msg.id}
              className={bubbleClass}
              data-chat-order-id={msg.orderId ? String(msg.orderId) : undefined}
            >
              <div className="bubble-meta-row">
                <div className="bubble-meta">
                  <span>{msg.role === 'user' ? 'Ty' : 'OKX EEA AI Agent'}</span>
                  <span className="bubble-collapsed-preview" hidden={!isCollapsed}>
                    — {firstLinePlain}
                  </span>
                </div>
                {isAssistant && (
                  <button
                    type="button"
                    className="btn-collapse-chat-bubble toggle-chat-bubble-btn"
                    title="Zwiń lub rozwiń tę transakcję w oknie Agenta AI"
                    onClick={() => onToggleChatBubble(msg.id)}
                  >
                    {isCollapsed ? '🔽 Rozwiń transakcję' : '🔼 Zwiń transakcję'}
                  </button>
                )}
              </div>
              <div
                className="bubble-text"
                hidden={isCollapsed}
                dangerouslySetInnerHTML={{ __html: formatMessageHtml(msg.text) }}
              />
            </div>
          );
        })}
      </div>
    </WindowContainer>
  );
}
