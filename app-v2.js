console.log('app-v2.js 로드 완료');
/**
 * BOBO 발주 검수 Dashboard V2
 * V2-01 파일 업로드
 */

const selectedFiles = {
  purchase: null,
  online: null,
  direct: null,
  policy: null
};

const excelData = {
  purchase: null,
  online: null,
  direct: null
};

let comparisonResults = [];
let activeComparisonFilter = 'all';

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

  connectFileInput(
  'policyFile',
  'policy'
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

  const downloadButton =
  document.getElementById(
    'downloadButton'
  );

if (downloadButton) {
  downloadButton.addEventListener(
    'click',
    downloadComparisonExcel
  );
}
  
  bindComparisonResultEvents();
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
renderComparisonResults();

    
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

  comparisonResults = [];
activeComparisonFilter = 'all';

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
      settlement: [
  '정산가',
  '정산 금액',
  '정산금액'
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

        settlement:
  getMappedCellValue(
    row,
    headerMap.settlement
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
  ),

settlement:
  normalizeSettlementAmount(
    standardRow.settlement
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

/**
 * 검수 결과 화면 출력
 */
function renderComparisonResults() {
  const resultSection =
    document.getElementById(
      'resultSection'
    );

  if (resultSection) {
    resultSection.hidden = false;
  }

  const summary =
    calculateComparisonSummary();

  const totalSettlementAmount =
  calculateTotalSettlementAmount();

setTextContent(
  'totalSettlementAmount',
  formatCurrency(
    totalSettlementAmount
  )
);

  setTextContent(
    'totalCount',
    formatNumber(
      summary.total
    ) + '건'
  );

  setTextContent(
    'normalCount',
    formatNumber(
      summary.normal
    ) + '건'
  );

  setTextContent(
    'onlineMissingCount',
    formatNumber(
      summary.onlineMissing
    ) + '건'
  );

  setTextContent(
    'directMissingCount',
    formatNumber(
      summary.directMissing
    ) + '건'
  );

  setTextContent(
    'modelMismatchCount',
    formatNumber(
      summary.modelMismatch
    ) + '건'
  );

  setTextContent(
    'quantityMismatchCount',
    formatNumber(
      summary.quantityMismatch
    ) + '건'
  );

  setTextContent(
    'duplicateCount',
    formatNumber(
      summary.duplicate
    ) + '건'
  );

activeComparisonFilter =
  'all';

const searchInput =
  document.getElementById(
    'resultSearch'
  );

if (searchInput) {
  searchInput.value = '';
}

updateActiveFilterButton();
renderFilteredComparisonResults();
}


/**
 * KPI 집계
 */
function calculateComparisonSummary() {
  return {
    total:
      comparisonResults.length,

    normal:
      comparisonResults.filter(
        result =>
          result.status === 'normal'
      ).length,

    onlineMissing:
      countComparisonCategory(
        'onlineMissing'
      ),

    directMissing:
      countComparisonCategory(
        'directMissing'
      ),

    modelMismatch:
      countComparisonCategory(
        'modelMismatch'
      ),

    quantityMismatch:
      countComparisonCategory(
        'quantityMismatch'
      ),

    duplicate:
      countComparisonCategory(
        'duplicate'
      )
  };
}


/**
 * 오류 유형별 개수
 */
function countComparisonCategory(
  category
) {
  return comparisonResults.filter(
    result =>
      result.categories.includes(
        category
      )
  ).length;
}


/**
 * 결과 테이블 출력
 */
function renderComparisonTable(
  results
) {
  const tableBody =
    document.getElementById(
      'resultTableBody'
    );

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = '';

  if (results.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td
          colspan="10"
          class="empty-table"
        >
          검수 결과가 없습니다.
        </td>
      </tr>
    `;

    return;
  }

  results.forEach(result => {
    const row =
      document.createElement(
        'tr'
      );

    const statusLabel =
      result.status === 'normal'
        ? '정상'
        : '오류';

    row.innerHTML = `
      <td>
        ${escapeHtml(statusLabel)}
      </td>

      <td>
        ${escapeHtml(result.reason)}
      </td>

      <td>
        ${escapeHtml(result.target)}
      </td>

      <td>
        ${escapeHtml(result.saleNumber)}
      </td>

      <td>
        ${escapeHtml(result.orderNumber)}
      </td>

      <td>
        ${escapeHtml(result.purchaseModel)}
      </td>

      <td>
        ${escapeHtml(result.compareModel)}
      </td>

      <td>
        ${formatNumber(
          result.purchaseQuantity
        )}
      </td>

      <td>
        ${formatNumber(
          result.compareQuantity
        )}
      </td>

      <td>
  ${formatCurrency(
    getSettlementByPurchaseRowNumber(
      result.purchaseRowNumber
    )
  )}
</td>

      <td>
        ${escapeHtml(
          result.purchaseRowNumber
        )}
      </td>
    `;

    tableBody.appendChild(row);
  });

  setTextContent(
    'resultCountText',
    '검색 결과 ' +
      formatNumber(
        results.length
      ) +
      '건'
  );
}


/**
 * 지정 요소에 텍스트 입력
 */
function setTextContent(
  elementId,
  value
) {
  const element =
    document.getElementById(
      elementId
    );

  if (element) {
    element.textContent =
      value;
  }
}

/**
 * 결과 필터·검색 이벤트 연결
 */
function bindComparisonResultEvents() {
  document
    .querySelectorAll(
      '.filter-button'
    )
    .forEach(button => {
      button.addEventListener(
        'click',
        () => {
          activeComparisonFilter =
            button.dataset.filter ||
            'all';

          updateActiveFilterButton();
          renderFilteredComparisonResults();
        }
      );
    });

  document
    .querySelectorAll(
      '.kpi-card'
    )
    .forEach(card => {
      card.addEventListener(
        'click',
        () => {
          activeComparisonFilter =
            card.dataset.filter ||
            'all';

          updateActiveFilterButton();
          renderFilteredComparisonResults();
        }
      );
    });

  const searchInput =
    document.getElementById(
      'resultSearch'
    );

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      renderFilteredComparisonResults
    );
  }
}


/**
 * 활성 필터 버튼 표시
 */
function updateActiveFilterButton() {
  document
    .querySelectorAll(
      '.filter-button'
    )
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.filter ===
          activeComparisonFilter
      );
    });
}


/**
 * 필터와 검색 조건을 적용해 출력
 */
function renderFilteredComparisonResults() {
  const searchInput =
    document.getElementById(
      'resultSearch'
    );

  const searchKeyword =
    normalizeComparisonSearchText(
      searchInput
        ? searchInput.value
        : ''
    );

  const filteredResults =
    comparisonResults.filter(result => {
      if (
        !matchesComparisonFilter(
          result,
          activeComparisonFilter
        )
      ) {
        return false;
      }

      if (!searchKeyword) {
        return true;
      }

      const searchableText =
        normalizeComparisonSearchText(
          [
            result.saleNumber,
            result.orderNumber,
            result.purchaseModel,
            result.compareModel,
            result.reason,
            result.target
          ].join(' ')
        );

      return searchableText.includes(
        searchKeyword
      );
    });

  renderComparisonTable(
    filteredResults
  );
}


/**
 * 결과 유형 필터 판정
 */
function matchesComparisonFilter(
  result,
  filter
) {
  if (
    !filter ||
    filter === 'all'
  ) {
    return true;
  }

  if (filter === 'error') {
    return result.status === 'error';
  }

  if (filter === 'normal') {
    return result.status === 'normal';
  }

  return (
    Array.isArray(
      result.categories
    ) &&
    result.categories.includes(
      filter
    )
  );
}


/**
 * 검색용 문자 정리
 */
function normalizeComparisonSearchText(
  value
) {
  return String(
    value ?? ''
  )
    .replace(/\s+/g, '')
    .toUpperCase();
}

/**
 * 정산금액 숫자 변환
 */
function normalizeSettlementAmount(
  value
) {
  const cleanedValue =
    String(
      value ?? ''
    )
      .replace(/,/g, '')
      .replace(/원/g, '')
      .replace(/\s+/g, '')
      .trim();

  const numberValue =
    Number(cleanedValue);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

/**
 * 발주서 행 번호 기준 정산금액 조회
 */
function getSettlementByPurchaseRowNumber(
  purchaseRowNumber
) {
  const purchaseRows =
    excelData.purchase &&
    Array.isArray(
      excelData.purchase.standardRows
    )
      ? excelData.purchase.standardRows
      : [];

  const matchedRow =
    purchaseRows.find(
      row =>
        String(
          row.excelRowNumber
        ) ===
        String(
          purchaseRowNumber
        )
    );

  if (!matchedRow) {
    return 0;
  }

  return Number(
    matchedRow.normalized
      .settlement
  ) || 0;
}


/**
 * 발주서 전체 정산금액 합계
 *
 * 검수 결과가 두 행으로 나뉘어도
 * 발주서 원본 행은 한 번만 합산합니다.
 */
function calculateTotalSettlementAmount() {
  const purchaseRows =
    excelData.purchase &&
    Array.isArray(
      excelData.purchase.standardRows
    )
      ? excelData.purchase.standardRows
      : [];

  return purchaseRows.reduce(
    (
      total,
      row
    ) =>
      total +
      (
        Number(
          row.normalized
            .settlement
        ) || 0
      ),
    0
  );
}


/**
 * 원화 표시
 */
function formatCurrency(
  value
) {
  return new Intl
    .NumberFormat(
      'ko-KR'
    )
    .format(
      Number(value) || 0
    ) + '원';
}

function formatCurrency(
  value
) {
  return new Intl
    .NumberFormat(
      'ko-KR'
    )
    .format(
      Number(value) || 0
    ) + '원';
}

/**
 * 검수 결과 엑셀 다운로드
 */
function downloadComparisonExcel() {
  if (
    typeof XLSX === 'undefined'
  ) {
    alert(
      '엑셀 라이브러리를 불러오지 못했습니다.'
    );

    return;
  }

  if (
    !Array.isArray(
      comparisonResults
    ) ||
    comparisonResults.length === 0
  ) {
    alert(
      '먼저 파일 3개를 업로드하고 검수를 실행해 주세요.'
    );

    return;
  }

  try {
    const summary =
      calculateComparisonSummary();

    const totalSettlementAmount =
      calculateTotalSettlementAmount();

    /**
     * 검수 요약 시트
     */
    const summaryRows = [
      [
        '구분',
        '건수 또는 금액'
      ],
      [
        '발주서 총 정산금액',
        totalSettlementAmount
      ],
      [
        '총 검수 항목',
        summary.total
      ],
      [
        '정상',
        summary.normal
      ],
      [
        '온라인 누락',
        summary.onlineMissing
      ],
      [
        '직배 누락',
        summary.directMissing
      ],
      [
        '모델/세트 구성 확인',
        summary.modelMismatch
      ],
      [
        '수량 불일치',
        summary.quantityMismatch
      ],
      [
        '중복 의심',
        summary.duplicate
      ],
      [],
      [
        '발주서 파일',
        selectedFiles.purchase
          ? selectedFiles.purchase.name
          : ''
      ],
      [
        '온라인 파일',
        selectedFiles.online
          ? selectedFiles.online.name
          : ''
      ],
      [
        '직배 파일',
        selectedFiles.direct
          ? selectedFiles.direct.name
          : ''
      ],
      [
        '검수 일시',
        formatDownloadDateTime(
          new Date()
        )
      ]
    ];

    /**
     * 전체 결과 행
     */
    const resultRows =
      comparisonResults.map(
        (
          result,
          index
        ) => {
          const settlementAmount =
            getSettlementByPurchaseRowNumber(
              result.purchaseRowNumber
            );

          return {
            순번:
              index + 1,

            판정:
              result.status ===
              'normal'
                ? '정상'
                : '확인 필요',

            오류유형:
              convertCategoryLabels(
                result.categories
              ),

            오류사유:
              result.reason || '',

            비교대상:
              result.target || '',

            판매번호:
              result.saleNumber || '',

            주문번호:
              result.orderNumber || '',

            발주모델:
              result.purchaseModel || '',

            비교모델:
              result.compareModel || '',

            발주수량:
              Number(
                result.purchaseQuantity
              ) || 0,

            비교수량:
              Number(
                result.compareQuantity
              ) || 0,

            정산금액:
              settlementAmount,

            발주서행:
              result.purchaseRowNumber || '',

            비교파일행:
              result.compareRowNumbers || ''
          };
        }
      );

    const normalRows =
      resultRows.filter(
        row =>
          row.판정 === '정상'
      );

    const errorRows =
      resultRows.filter(
        row =>
          row.판정 !== '정상'
      );

    /**
     * 엑셀 워크북 생성
     */
    const workbook =
      XLSX.utils.book_new();

    const summarySheet =
      XLSX.utils.aoa_to_sheet(
        summaryRows
      );

    const errorSheet =
      XLSX.utils.json_to_sheet(
        errorRows
      );

    const normalSheet =
      XLSX.utils.json_to_sheet(
        normalRows
      );

    const allResultSheet =
      XLSX.utils.json_to_sheet(
        resultRows
      );

    /**
     * 열 너비 설정
     */
    summarySheet['!cols'] = [
      {
        wch: 28
      },
      {
        wch: 34
      }
    ];

    const resultColumnWidths = [
      { wch: 8 },
      { wch: 12 },
      { wch: 26 },
      { wch: 38 },
      { wch: 28 },
      { wch: 18 },
      { wch: 20 },
      { wch: 26 },
      { wch: 36 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 }
    ];

    errorSheet['!cols'] =
      resultColumnWidths;

    normalSheet['!cols'] =
      resultColumnWidths;

    allResultSheet['!cols'] =
      resultColumnWidths;

    /**
     * 정산금액 숫자 서식
     */
    applySettlementNumberFormat(
      summarySheet,
      1
    );

    applySettlementColumnFormat(
      errorSheet
    );

    applySettlementColumnFormat(
      normalSheet
    );

    applySettlementColumnFormat(
      allResultSheet
    );

    /**
     * 시트 추가
     */
    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      '검수요약'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      errorSheet,
      '오류내역'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      normalSheet,
      '정상내역'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      allResultSheet,
      '전체결과'
    );

    const fileName =
      'BOBO_발주검수결과_' +
      formatDownloadFileDate(
        new Date()
      ) +
      '.xlsx';

    XLSX.writeFile(
      workbook,
      fileName
    );

  } catch (error) {
    console.error(
      '검수 결과 다운로드 오류:',
      error
    );

    alert(
      '검수 결과 엑셀 생성 중 오류가 발생했습니다.\n' +
      error.message
    );
  }
}


/**
 * 검수 유형 표시명 변환
 */
function convertCategoryLabels(
  categories
) {
  if (
    !Array.isArray(
      categories
    ) ||
    categories.length === 0
  ) {
    return '';
  }

  const labelMap = {
    onlineMissing:
      '온라인 누락',

    directMissing:
      '직배 누락',

    purchaseMissing:
      '발주서 누락',

    saleNumberMismatch:
      '판매번호 불일치',

    modelMismatch:
      '모델/세트 구성 확인',

    quantityMismatch:
      '수량 불일치',

    duplicate:
      '중복 의심'
  };

  return categories
    .map(
      category =>
        labelMap[category] ||
        category
    )
    .join(', ');
}


/**
 * 요약 시트 정산금액 표시 형식
 */
function applySettlementNumberFormat(
  worksheet,
  rowIndex
) {
  const cellAddress =
    XLSX.utils.encode_cell({
      r: rowIndex,
      c: 1
    });

  if (
    worksheet[cellAddress]
  ) {
    worksheet[cellAddress].z =
      '#,##0"원"';
  }
}


/**
 * 결과 시트의 정산금액 열 형식
 */
function applySettlementColumnFormat(
  worksheet
) {
  if (
    !worksheet ||
    !worksheet['!ref']
  ) {
    return;
  }

  const range =
    XLSX.utils.decode_range(
      worksheet['!ref']
    );

  /*
   * 정산금액은 12번째 열
   * A=0 기준으로 L=11
   */
  const settlementColumnIndex = 11;

  for (
    let rowIndex = 1;
    rowIndex <= range.e.r;
    rowIndex += 1
  ) {
    const cellAddress =
      XLSX.utils.encode_cell({
        r: rowIndex,
        c: settlementColumnIndex
      });

    if (
      worksheet[cellAddress]
    ) {
      worksheet[cellAddress].z =
        '#,##0"원"';
    }
  }
}


/**
 * 다운로드 파일명용 날짜
 */
function formatDownloadFileDate(
  date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  const hour =
    String(
      date.getHours()
    ).padStart(
      2,
      '0'
    );

  const minute =
    String(
      date.getMinutes()
    ).padStart(
      2,
      '0'
    );

  return (
    year +
    month +
    day +
    '_' +
    hour +
    minute
  );
}


/**
 * 검수 일시 표시
 */
function formatDownloadDateTime(
  date
) {
  return new Intl
    .DateTimeFormat(
      'ko-KR',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }
    )
    .format(date);
}
