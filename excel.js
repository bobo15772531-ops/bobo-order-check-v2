/**
 * BOBO 발주 검수 Dashboard V2
 * 엑셀 파일 읽기 전용
 */


/**
 * 엑셀 파일 1개 읽기
 */
async function readExcelFile(
  file,
  fileType
) {
  if (
    typeof XLSX === 'undefined'
  ) {
    throw new Error(
      '엑셀 라이브러리를 불러오지 못했습니다.'
    );
  }

  if (!file) {
    throw new Error(
      '선택된 파일이 없습니다.'
    );
  }

  const extension =
    getFileExtension(
      file.name
    );

  if (
    extension !== 'xlsx' &&
    extension !== 'xls'
  ) {
    throw new Error(
      'xlsx 또는 xls 파일만 사용할 수 있습니다.'
    );
  }

  const arrayBuffer =
    await file.arrayBuffer();

  const workbook =
    XLSX.read(
      arrayBuffer,
      {
        type: 'array',
        raw: false,
        cellDates: true
      }
    );

  if (
    !workbook.SheetNames ||
    workbook.SheetNames.length === 0
  ) {
    throw new Error(
      '엑셀 시트를 찾을 수 없습니다.'
    );
  }

  const sheetName =
    workbook.SheetNames[0];

  const worksheet =
    workbook.Sheets[
      sheetName
    ];

  const rawRows =
    XLSX.utils.sheet_to_json(
      worksheet,
      {
        header: 1,
        defval: '',
        raw: false,
        blankrows: false
      }
    );

  if (
    !Array.isArray(rawRows) ||
    rawRows.length < 2
  ) {
    throw new Error(
      '헤더 또는 데이터 행이 없습니다.'
    );
  }

  const headerRowIndex =
    findBestHeaderRow(
      rawRows,
      fileType
    );

  if (headerRowIndex === -1) {
    throw new Error(
      '헤더 행을 찾지 못했습니다.'
    );
  }

  const originalHeaders =
    rawRows[headerRowIndex]
      .map(value =>
        normalizeExcelText(
          value
        )
      );

  const headers =
    originalHeaders
      .map(normalizeExcelHeader);

  const dataRows =
    rawRows
      .slice(
        headerRowIndex + 1
      )
      .filter(row =>
        row.some(value =>
          normalizeExcelText(
            value
          ) !== ''
        )
      );

  return {
    fileType,
    fileName: file.name,
    sheetName,
    headerRowNumber:
      headerRowIndex + 1,
    originalHeaders,
    headers,
    rowCount:
      dataRows.length,
    rawRows:
      dataRows
  };
}


/**
 * 헤더 행 자동 탐색
 */
function findBestHeaderRow(
  rows,
  fileType
) {
  const expectedHeaders =
    getExpectedHeaders(
      fileType
    );

  const searchLimit =
    Math.min(
      rows.length,
      20
    );

  let bestIndex = -1;
  let bestScore = 0;

  for (
    let index = 0;
    index < searchLimit;
    index += 1
  ) {
    const currentHeaders =
      rows[index]
        .map(normalizeExcelHeader);

    let score = 0;

    expectedHeaders.forEach(
      aliases => {
        const found =
          aliases.some(alias =>
            currentHeaders.includes(
              normalizeExcelHeader(
                alias
              )
            )
          );

        if (found) {
          score += 1;
        }
      }
    );

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore >= 3
    ? bestIndex
    : -1;
}


/**
 * 파일별 예상 헤더
 */
function getExpectedHeaders(
  fileType
) {
  if (fileType === 'purchase') {
    return [
      [
        '판매번호',
        '판매 번호'
      ],
      [
        '주문번호',
        '주문 번호'
      ],
      [
        '모델명',
        '모델'
      ],
      [
        '수량',
        '주문수량',
        '주문 수량'
      ],
      [
        '온라인 주문번호',
        '온라인주문번호'
      ],
      [
        '직배 주문번호',
        '직배주문번호'
      ]
    ];
  }

  if (fileType === 'online') {
    return [
      [
        '판매번호',
        '판매 번호'
      ],
      [
        '주문번호',
        '주문 번호'
      ],
      [
        '모델',
        '모델명'
      ],
      [
        '수량',
        '주문수량',
        '주문 수량'
      ],
      [
        '주문상태',
        '주문 상태'
      ]
    ];
  }

  if (fileType === 'direct') {
    return [
      [
        '판매번호',
        '판매 번호'
      ],
      [
        '주문번호',
        '주문 번호'
      ],
      [
        '모델',
        '모델명'
      ],
      [
        '주문',
        '주문수량',
        '주문 수량',
        '수량'
      ]
    ];
  }

  return [];
}


/**
 * 파일 3개 읽기
 */
async function readAllExcelFiles(
  files
) {
  const purchase =
    await readExcelFile(
      files.purchase,
      'purchase'
    );

  const online =
    await readExcelFile(
      files.online,
      'online'
    );

  const direct =
    await readExcelFile(
      files.direct,
      'direct'
    );

  return {
    purchase,
    online,
    direct
  };
}


/**
 * 확장자 추출
 */
function getFileExtension(
  fileName
) {
  return String(
    fileName || ''
  )
    .split('.')
    .pop()
    .toLowerCase();
}


/**
 * 일반 텍스트 정리
 */
function normalizeExcelText(
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
 * 헤더 비교용 정리
 */
function normalizeExcelHeader(
  value
) {
  return normalizeExcelText(
    value
  )
    .replace(/\s+/g, '')
    .toUpperCase();
}


