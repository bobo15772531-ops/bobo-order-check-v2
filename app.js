/**
 * BOBO 발주 검수 Dashboard V2
 * STEP 1: 파일 선택 상태 확인
 */

const selectedFiles = {
  purchase: null,
  online: null,
  direct: null
};

document.addEventListener(
  'DOMContentLoaded',
  initializeApp
);

function initializeApp() {
  bindFileInput(
    'purchaseFile',
    'purchase'
  );

  bindFileInput(
    'onlineFile',
    'online'
  );

  bindFileInput(
    'directFile',
    'direct'
  );

  const startButton =
    document.getElementById(
      'startButton'
    );

  if (startButton) {
    startButton.disabled = true;

    startButton.addEventListener(
      'click',
      handleStartCheck
    );
  }

  updateStatus();
}

function bindFileInput(
  inputId,
  fileType
) {
  const input =
    document.getElementById(
      inputId
    );

  if (!input) {
    return;
  }

  input.addEventListener(
    'change',
    event => {
      const file =
        event.target.files &&
        event.target.files[0]
          ? event.target.files[0]
          : null;

      selectedFiles[fileType] =
        file;

      updateStatus();
    }
  );
}

function updateStatus() {
  const status =
    document.getElementById(
      'status'
    );

  const startButton =
    document.getElementById(
      'startButton'
    );

  const readyCount =
    Object.values(
      selectedFiles
    ).filter(Boolean).length;

  const allReady =
    readyCount === 3;

  if (startButton) {
    startButton.disabled =
      !allReady;
  }

  if (!status) {
    return;
  }

  if (allReady) {
    status.innerHTML = `
      <strong>파일 3개 선택 완료</strong><br>
      발주서: ${escapeHtml(
        selectedFiles.purchase.name
      )}<br>
      온라인: ${escapeHtml(
        selectedFiles.online.name
      )}<br>
      직배: ${escapeHtml(
        selectedFiles.direct.name
      )}
    `;

    status.className =
      'status-success';

    return;
  }

  status.textContent =
    `현재 ${readyCount}개 선택 · 파일 3개를 모두 선택해 주세요.`;

  status.className =
    'status-ready';
}

function handleStartCheck() {
  if (
    !selectedFiles.purchase ||
    !selectedFiles.online ||
    !selectedFiles.direct
  ) {
    setStatusError(
      '파일 3개를 모두 선택해 주세요.'
    );

    return;
  }

  const status =
    document.getElementById(
      'status'
    );

  if (status) {
    status.textContent =
      '파일 선택 확인 완료. 다음 단계에서 엑셀 내용을 읽습니다.';

    status.className =
      'status-success';
  }
}

function setStatusError(
  message
) {
  const status =
    document.getElementById(
      'status'
    );

  if (!status) {
    return;
  }

  status.textContent =
    message;

  status.className =
    'status-error';
}

function escapeHtml(
  value
) {
  return String(
    value ?? ''
  )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
