/**
 * BOBO 발주 검수 Dashboard V2
 * V2-01 파일 업로드
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
  connectFileInput(
    'purchaseFile',
    'purchase'
  );

  connectFileInput(
    'onlineFile',
    'online'
  );

  connectFileInput(
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
      handleStartButton
    );
  }

  updateUploadStatus();
}


/**
 * 파일 선택창 연결
 */
function connectFileInput(
  inputId,
  fileType
) {
  const input =
    document.getElementById(
      inputId
    );

  if (!input) {
    console.error(
      inputId +
        ' 요소를 찾지 못했습니다.'
    );

    return;
  }

  input.addEventListener(
    'change',
    event => {
      const file =
        event.target.files?.[0] ||
        null;

      selectedFiles[fileType] =
        file;

      updateUploadStatus();
    }
  );
}


/**
 * 파일 선택 상태 표시
 */
function updateUploadStatus() {
  const status =
    document.getElementById(
      'status'
    );

  const startButton =
    document.getElementById(
      'startButton'
    );

  const selectedCount =
    Object.values(
      selectedFiles
    ).filter(Boolean).length;

  const allSelected =
    selectedCount === 3;

  if (startButton) {
    startButton.disabled =
      !allSelected;

    startButton.textContent =
      allSelected
        ? '검수 시작'
        : `파일 ${selectedCount}/3 선택`;
  }

  if (!status) {
    return;
  }

  if (!allSelected) {
    status.className =
      'status-ready';

    status.innerHTML = `
      <strong>
        현재 ${selectedCount}개 선택
      </strong>
      <br>
      발주서:
      ${getFileName('purchase')}
      <br>
      온라인:
      ${getFileName('online')}
      <br>
      직배:
      ${getFileName('direct')}
    `;

    return;
  }

  status.className =
    'status-success';

  status.innerHTML = `
    <strong>
      파일 3개 선택 완료
    </strong>
    <br>
    발주서:
    ${getFileName('purchase')}
    <br>
    온라인:
    ${getFileName('online')}
    <br>
    직배:
    ${getFileName('direct')}
  `;
}


/**
 * 파일명 표시
 */
function getFileName(
  fileType
) {
  const file =
    selectedFiles[fileType];

  if (!file) {
    return '선택 안 됨';
  }

  return escapeHtml(
    file.name
  );
}


/**
 * 검수 시작 버튼
 */
function handleStartButton() {
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
    status.className =
      'status-success';

    status.textContent =
      '파일 선택 확인 완료. 다음 단계에서 엑셀 내용을 읽습니다.';
  }
}


/**
 * 오류 상태 표시
 */
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

  status.className =
    'status-error';

  status.textContent =
    message;
}


/**
 * HTML 안전 처리
 */
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
