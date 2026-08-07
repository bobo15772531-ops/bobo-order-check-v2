console.log('app-v2.js 로드 완료');
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

let comparisonResults = [];

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

    excelData.purchase.standardRows =
  standardizeExcelRows(
    excelData.purchase,
    'purchase'
  );

excelData.online.standardRows =
  standardizeExcelRows(
    excelData.online,
    'online'
  );

excelData.direct.standardRows =
  standardizeExcelRows(
    excelData.direct,
    'direct'
  );

    comparisonResults =
  runOrderComparison(
    excelData.purchase
      .standardRows,

    excelData.online
      .standardRows,

    excelData.direct
      .standardRows
  );

console.log(
  '검수 결과:',
  comparisonResults
);

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

/**
 * 엑셀 파일의 헤더를 표준 필드명으로 연결
 */
function createHeaderMap(
  excelFile,
  fileType
) {
  const headerAliases = {
    purchase: {
      saleNumber: [
        '판매번호',
        '판매 번호'
      ],
      orderNumber: [
        '주문번호',
        '주문 번호'
      ],
      onlineOrderNumber: [
        '온라인 주문번호',
        '온라인주문번호'
      ],
      directOrderNumber: [
        '직배 주문번호',
        '직배주문번호'
      ],
      model: [
        '모델명',
        '모델'
      ],
      quantity: [
        '수량',
        '주문수량',
        '주문 수량'
      ],
      recipient: [
        '수령인',
        '인수자',
        '받는사람'
      ],
      orderDate: [
        '주문일자',
        '주문 일자'
      ]
    },

    online: {
      saleNumber: [
        '판매번호',
        '판매 번호'
      ],
      orderNumber: [
        '주문번호',
        '주문 번호'
      ],
      model: [
        '모델',
        '모델명'
      ],
      quantity: [
        '수량',
        '주문수량',
        '주문 수량'
      ],
      recipient: [
        '인수자',
        '수령인',
        '받는사람'
      ],
      orderDate: [
        '주문일자',
        '주문 일자'
      ],
      orderStatus: [
        '주문상태',
        '주문 상태'
      ]
    },

    direct: {
      saleNumber: [
        '판매번호',
        '판매 번호'
      ],
      orderNumber: [
        '주문번호',
        '주문 번호'
      ],
      model: [
        '모델',
        '모델명'
      ],
      quantity: [
        '주문',
        '주문수량',
        '주문 수량',
        '수량'
      ],
      recipient: [
        '인수자',
        '수령인',
        '받는사람'
      ],
      orderDate: [
        '주문일자',
        '주문 일자'
      ]
    }
  };

  const fileAliases =
    headerAliases[fileType];

  if (!fileAliases) {
    throw new Error(
      '알 수 없는 파일 유형입니다: ' +
        fileType
    );
  }

  const map = {};

  Object
    .entries(fileAliases)
    .forEach(
      ([
        fieldName,
        aliases
      ]) => {
        let columnIndex = -1;

        for (
          const alias of aliases
        ) {
          const normalizedAlias =
            normalizeExcelHeader(
              alias
            );

          columnIndex =
            excelFile.headers.indexOf(
              normalizedAlias
            );

          if (columnIndex !== -1) {
            break;
          }
        }

        map[fieldName] =
          columnIndex;
      }
    );

  return map;
}


/**
 * 엑셀 데이터 행을 공통 구조로 변환
 */
function standardizeExcelRows(
  excelFile,
  fileType
) {
  const headerMap =
    createHeaderMap(
      excelFile,
      fileType
    );

  const requiredFields = [
    'saleNumber',
    'orderNumber',
    'model',
    'quantity'
  ];

  const missingFields =
    requiredFields.filter(
      fieldName =>
        headerMap[fieldName] === -1
    );

  if (missingFields.length > 0) {
    throw new Error(
      getFileTypeLabel(fileType) +
        ' 필수 헤더 누락: ' +
        missingFields.join(', ')
    );
  }

  return excelFile.rawRows.map(
    (row, index) => {
      const standardRow = {
        sourceType:
          fileType,

        excelRowNumber:
          excelFile.headerRowNumber +
          index +
          1,

        saleNumber:
          getMappedCellValue(
            row,
            headerMap.saleNumber
          ),

        orderNumber:
          getMappedCellValue(
            row,
            headerMap.orderNumber
          ),

        onlineOrderNumber:
          getMappedCellValue(
            row,
            headerMap.onlineOrderNumber
          ),

        directOrderNumber:
          getMappedCellValue(
            row,
            headerMap.directOrderNumber
          ),

        model:
          getMappedCellValue(
            row,
            headerMap.model
          ),

        quantity:
          getMappedCellValue(
            row,
            headerMap.quantity
          ),

        recipient:
          getMappedCellValue(
            row,
            headerMap.recipient
          ),

        orderDate:
          getMappedCellValue(
            row,
            headerMap.orderDate
          ),

        orderStatus:
          getMappedCellValue(
            row,
            headerMap.orderStatus
          )
      };

      standardRow.normalized = {
        saleNumber:
          normalizeMatchKey(
            standardRow.saleNumber
          ),

        orderNumber:
          normalizeMatchKey(
            standardRow.orderNumber
          ),

        onlineOrderNumber:
          normalizeMatchKey(
            standardRow
              .onlineOrderNumber
          ),

        directOrderNumber:
          normalizeMatchKey(
            standardRow
              .directOrderNumber
          ),

        model:
          normalizeModelName(
            standardRow.model
          ),

        quantity:
          normalizeQuantity(
            standardRow.quantity
          )
      };

      return standardRow;
    }
  );
}


/**
 * 열 번호에 해당하는 셀 값 추출
 */
function getMappedCellValue(
  row,
  columnIndex
) {
  if (
    columnIndex === undefined ||
    columnIndex === -1
  ) {
    return '';
  }

  return normalizeStandardText(
    row[columnIndex]
  );
}


/**
 * 판매번호와 주문번호 정리
 */
function normalizeMatchKey(
  value
) {
  return normalizeStandardText(
    value
  )
    .replace(/\.0$/, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}


/**
 * 모델명 비교용 정리
 *
 * 앞 몇 자리로 자르지 않고
 * 전체 모델명을 사용합니다.
 */
function normalizeModelName(
  value
) {
  return normalizeStandardText(
    value
  )
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[-_/]/g, '');
}


/**
 * 수량을 숫자로 변환
 */
function normalizeQuantity(
  value
) {
  const numberValue =
    Number(
      String(
        value ?? ''
      )
        .replace(/,/g, '')
        .replace(/개/g, '')
        .replace(/\s+/g, '')
        .trim()
    );

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}


/**
 * 일반 텍스트 정리
 */
function normalizeStandardText(
  value
) {
  return String(
    value ?? ''
  )
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


/**
 * 파일 유형 표시명
 */
function getFileTypeLabel(
  fileType
) {
  if (fileType === 'purchase') {
    return '발주서';
  }

  if (fileType === 'online') {
    return '온라인';
  }

  if (fileType === 'direct') {
    return '직배';
  }

  return fileType;
}
