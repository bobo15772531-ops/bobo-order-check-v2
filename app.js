/**
 * BOBO 발주 검수 Dashboard V2
 * V2-01 파일 업로드
 */

const selectedFiles = {
  purchase: null,
  online: null,
  direct: null
};

const excelData = {
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

  const resetButton =
  document.getElementById(
    'resetButton'
  );

if (resetButton) {
  resetButton.addEventListener(
    'click',
    resetUploadedFiles
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
 * 엑셀 파일 읽기 시작
 */
async function handleStartButton() {
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

  const startButton =
    document.getElementById(
      'startButton'
    );

  const status =
    document.getElementById(
      'status'
    );

  if (startButton) {
    startButton.disabled = true;
    startButton.textContent =
      '엑셀 읽는 중...';
  }

  if (status) {
    status.className =
      'status-loading';

    status.textContent =
      '발주서, 온라인, 직배 파일을 읽고 있습니다.';
  }

  try {
    const result =
      await readAllExcelFiles(
        selectedFiles
      );

    excelData.purchase =
      result.purchase;

    excelData.online =
      result.online;

    excelData.direct =
      result.direct;

    renderExcelReadSummary();

  } catch (error) {
    console.error(error);

    setStatusError(
      '엑셀 읽기 오류: ' +
        error.message
    );

  } finally {
    if (startButton) {
      startButton.disabled = false;
      startButton.textContent =
        '다시 읽기';
    }
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

/**
 * 업로드 파일과 읽은 엑셀 데이터 초기화
 */
function resetUploadedFiles() {
  selectedFiles.purchase = null;
  selectedFiles.online = null;
  selectedFiles.direct = null;

  excelData.purchase = null;
  excelData.online = null;
  excelData.direct = null;

  [
    'purchaseFile',
    'onlineFile',
    'directFile'
  ].forEach(inputId => {
    const input =
      document.getElementById(
        inputId
      );

    if (input) {
      input.value = '';
    }
  });

  const resultSection =
    document.getElementById(
      'resultSection'
    );

  if (resultSection) {
    resultSection.hidden = true;
  }

  updateUploadStatus();
}
/**
 * 엑셀 읽기 결과 표시
 */
function renderExcelReadSummary() {
  const status =
    document.getElementById(
      'status'
    );

  if (!status) {
    return;
  }

  status.className =
    'status-success';

  status.innerHTML = `
    <strong>
      엑셀 3개 읽기 완료
    </strong>

    <br><br>

    발주서:
    ${formatNumber(
      excelData.purchase.rowCount
    )}행

    <br>
    헤더:
    ${escapeHtml(
      excelData.purchase
        .originalHeaders
        .filter(Boolean)
        .join(', ')
    )}

    <br><br>

    온라인:
    ${formatNumber(
      excelData.online.rowCount
    )}행

    <br>
    헤더:
    ${escapeHtml(
      excelData.online
        .originalHeaders
        .filter(Boolean)
        .join(', ')
    )}

    <br><br>

    직배:
    ${formatNumber(
      excelData.direct.rowCount
    )}행

    <br>
    헤더:
    ${escapeHtml(
      excelData.direct
        .originalHeaders
        .filter(Boolean)
        .join(', ')
    )}
  `;
}


/**
 * 숫자 천 단위 표시
 */
function formatNumber(
  value
) {
  return new Intl
    .NumberFormat(
      'ko-KR'
    )
    .format(
      Number(value) || 0
    );
}


