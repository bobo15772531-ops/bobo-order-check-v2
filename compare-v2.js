console.log(
  'compare-v2.js 로드 완료'
);

/**
 * BOBO 발주 검수 Dashboard V2
 * 주문 비교 엔진
 */

/**
 * 전체 검수 실행
 *
 * 발주서에 명시된 온라인 주문번호와
 * 직배 주문번호만 비교 대상으로 사용합니다.
 */
function runOrderComparison(
  purchaseRows,
  onlineRows,
  directRows
) {
  const results = [];

  const onlineIndex =
    createComparisonIndex(
      onlineRows,
      'online'
    );

  const directIndex =
    createComparisonIndex(
      directRows,
      'direct'
    );

  const usedOnlineRowIds =
    new Set();

  const usedDirectRowIds =
    new Set();

  purchaseRows.forEach(
    purchaseRow => {
      const onlineOrderNumber =
        purchaseRow.normalized
          .onlineOrderNumber;

      const directOrderNumber =
        purchaseRow.normalized
          .directOrderNumber;

      /*
       * 발주서 온라인 주문번호가 있는 행만
       * 온라인 주문 파일과 비교합니다.
       */
      if (onlineOrderNumber) {
        results.push(
          comparePurchaseRow({
            purchaseRow,
            sourceType:
              'online',

            expectedOrderNumber:
              onlineOrderNumber,

            sourceIndex:
              onlineIndex,

            usedRowIds:
              usedOnlineRowIds
          })
        );
      }

      /*
       * 발주서 직배 주문번호가 있는 행만
       * 직배 주문 파일과 비교합니다.
       */
      if (directOrderNumber) {
        results.push(
          comparePurchaseRow({
            purchaseRow,
            sourceType:
              'direct',

            expectedOrderNumber:
              directOrderNumber,

            sourceIndex:
              directIndex,

            usedRowIds:
              usedDirectRowIds
          })
        );
      }

      /*
       * 온라인 주문번호와 직배 주문번호가
       * 모두 없는 발주서 행은 검수 대상에서 제외합니다.
       *
       * 일반 주문번호로 온라인·직배를 찾지 않습니다.
       */
    }
  );

  /*
   * 온라인·직배 파일의 나머지 행을
   * 자동으로 발주서 누락 처리하지 않습니다.
   *
   * 이 파일들은 당일 발주서보다 더 넓은
   * 기간이나 주문 범위를 포함할 수 있기 때문입니다.
   */

  return results;
}



/**
 * 비교 파일 인덱스 생성
 *
 * 주문번호를 1차 검색키로 사용합니다.
 * 판매번호는 주문을 찾은 후 별도로 검증합니다.
 */
function createComparisonIndex(
  rows,
  sourceType
) {
  const index = new Map();

  rows.forEach(row => {
    const orderNumber =
      normalizeCompareValue(
        row.normalized.orderNumber
      );

    if (!orderNumber) {
      return;
    }

    if (!index.has(orderNumber)) {
      index.set(
        orderNumber,
        []
      );
    }

    index
      .get(orderNumber)
      .push({
        ...row,
        sourceType
      });
  });

  return index;
}


/**
 * 일반 주문번호 비교
 */
function compareGeneralOrderNumber({
  results,
  purchaseRow,
  generalOrderNumber,
  onlineIndex,
  directIndex,
  usedOnlineRowIds,
  usedDirectRowIds
}) {
  if (!generalOrderNumber) {
    results.push(
      createMissingOrderNumberResult(
        purchaseRow
      )
    );

    return;
  }

  const saleNumber =
    purchaseRow.normalized
      .saleNumber;

  const orderKey =
    createOrderMatchKey(
      saleNumber,
      generalOrderNumber
    );

  const existsOnline =
    onlineIndex
      .byOrderKey
      .has(orderKey);

  const existsDirect =
    directIndex
      .byOrderKey
      .has(orderKey);

  if (existsOnline) {
    results.push(
      comparePurchaseRow({
        purchaseRow,
        sourceType:
          'online',
        expectedOrderNumber:
          generalOrderNumber,
        sourceIndex:
          onlineIndex,
        usedRowIds:
          usedOnlineRowIds
      })
    );
  }

  if (existsDirect) {
    results.push(
      comparePurchaseRow({
        purchaseRow,
        sourceType:
          'direct',
        expectedOrderNumber:
          generalOrderNumber,
        sourceIndex:
          directIndex,
        usedRowIds:
          usedDirectRowIds
      })
    );
  }

  if (
    !existsOnline &&
    !existsDirect
  ) {
    results.push({
      status: 'error',

      categories: [
        'onlineMissing',
        'directMissing'
      ],

      reason:
        '온라인·직배 파일에서 주문을 찾지 못했습니다.',

      target:
        '온라인/직배',

      saleNumber:
        purchaseRow.saleNumber,

      orderNumber:
        purchaseRow.orderNumber,

      purchaseModel:
        purchaseRow.model,

      compareModel: '',

      purchaseQuantity:
        purchaseRow.normalized
          .quantity,

      compareQuantity: 0,

      purchaseRowNumber:
        purchaseRow.excelRowNumber,

      compareRowNumbers: ''
    });
  }
}


/**
 * 발주서 한 행 비교
 */
function comparePurchaseRow({
  purchaseRow,
  sourceType,
  expectedOrderNumber,
  sourceIndex,
  usedRowIds
}) {
  const saleNumber =
    purchaseRow.normalized
      .saleNumber;

  const purchaseModel =
    purchaseRow.normalized
      .model;

  const purchaseQuantity =
    purchaseRow.normalized
      .quantity;

  const orderKey =
    createOrderMatchKey(
      saleNumber,
      expectedOrderNumber
    );

  const orderCandidates =
    sourceIndex
      .byOrderKey
      .get(orderKey) ||
    [];

  const targetLabel =
    getComparisonSourceLabel(
      sourceType
    );

  /*
   * 판매번호 + 주문번호를
   * 찾지 못한 경우
   */
  if (
    orderCandidates.length === 0
  ) {
    return {
      status: 'error',

      categories: [
        sourceType === 'online'
          ? 'onlineMissing'
          : 'directMissing'
      ],

      reason:
        targetLabel +
        ' 파일 누락',

      target:
        targetLabel,

      saleNumber:
        purchaseRow.saleNumber,

      orderNumber:
        expectedOrderNumber,

      purchaseModel:
        purchaseRow.model,

      compareModel: '',

      purchaseQuantity,

      compareQuantity: 0,

      purchaseRowNumber:
        purchaseRow.excelRowNumber,

      compareRowNumbers: ''
    };
  }

  /*
   * 판매번호 + 주문번호가 같은 후보 중
   * 모델명 전체가 같은 행 검색
   */
  const modelCandidates =
    orderCandidates.filter(
      sourceRow =>
        sourceRow.normalized
          .model ===
        purchaseModel
    );

  const categories = [];
  const reasons = [];

  /*
   * 모델명이 같은 행이 없으면
   * 모델 불일치
   */
  if (
    modelCandidates.length === 0
  ) {
    orderCandidates.forEach(
      row => {
        usedRowIds.add(
          row.comparisonRowId
        );
      }
    );

    categories.push(
      'modelMismatch'
    );

    reasons.push(
      '모델 불일치'
    );

    return {
      status: 'error',

      categories,

      reason:
        reasons.join(' / '),

      target:
        targetLabel,

      saleNumber:
        purchaseRow.saleNumber,

      orderNumber:
        expectedOrderNumber,

      purchaseModel:
        purchaseRow.model,

      compareModel:
        getUniqueModelNames(
          orderCandidates
        ).join(', '),

      purchaseQuantity,

      compareQuantity:
        sumComparisonQuantity(
          orderCandidates
        ),

      purchaseRowNumber:
        purchaseRow.excelRowNumber,

      compareRowNumbers:
        orderCandidates
          .map(row =>
            row.excelRowNumber
          )
          .join(', ')
    };
  }

  modelCandidates.forEach(
    row => {
      usedRowIds.add(
        row.comparisonRowId
      );
    }
  );

  const compareQuantity =
    sumComparisonQuantity(
      modelCandidates
    );

  if (
    purchaseQuantity !==
    compareQuantity
  ) {
    categories.push(
      'quantityMismatch'
    );

    reasons.push(
      '수량 불일치'
    );
  }

  /*
   * 같은 판매번호·주문번호·모델이
   * 여러 행이면 중복 의심
   */
  if (
    modelCandidates.length > 1
  ) {
    categories.push(
      'duplicate'
    );

    reasons.push(
      '동일 주문·모델 ' +
      modelCandidates.length +
      '행'
    );
  }

  return {
    status:
      categories.length === 0
        ? 'normal'
        : 'error',

    categories,

    reason:
      categories.length === 0
        ? '정상 일치'
        : reasons.join(' / '),

    target:
      targetLabel,

    saleNumber:
      purchaseRow.saleNumber,

    orderNumber:
      expectedOrderNumber,

    purchaseModel:
      purchaseRow.model,

    compareModel:
      getUniqueModelNames(
        modelCandidates
      ).join(', '),

    purchaseQuantity,

    compareQuantity,

    purchaseRowNumber:
      purchaseRow.excelRowNumber,

    compareRowNumbers:
      modelCandidates
        .map(row =>
          row.excelRowNumber
        )
        .join(', ')
  };
}


/**
 * 발주서에 연결되지 않은
 * 온라인·직배 행 추가
 */
function appendUnmatchedSourceRows({
  results,
  sourceRows,
  usedRowIds,
  sourceType
}) {
  const groupedRows =
    new Map();

  sourceRows.forEach(row => {
    if (
      usedRowIds.has(
        row.comparisonRowId
      )
    ) {
      return;
    }

    const fullKey =
      createFullMatchKey(
        row.normalized
          .saleNumber,
        row.normalized
          .orderNumber,
        row.normalized
          .model
      );

    if (
      !groupedRows.has(
        fullKey
      )
    ) {
      groupedRows.set(
        fullKey,
        []
      );
    }

    groupedRows
      .get(fullKey)
      .push(row);
  });

  groupedRows.forEach(
    rows => {
      const firstRow =
        rows[0];

      results.push({
        status: 'error',

        categories: [
          'purchaseMissing'
        ],

        reason:
          '발주서에서 연결되지 않은 주문',

        target:
          getComparisonSourceLabel(
            sourceType
          ),

        saleNumber:
          firstRow.saleNumber,

        orderNumber:
          firstRow.orderNumber,

        purchaseModel: '',

        compareModel:
          firstRow.model,

        purchaseQuantity: 0,

        compareQuantity:
          sumComparisonQuantity(
            rows
          ),

        purchaseRowNumber: '',

        compareRowNumbers:
          rows
            .map(row =>
              row.excelRowNumber
            )
            .join(', ')
      });
    }
  );
}


/**
 * 비교할 주문번호가 없는 발주서 행
 */
function createMissingOrderNumberResult(
  purchaseRow
) {
  return {
    status: 'error',

    categories: [
      'onlineMissing',
      'directMissing'
    ],

    reason:
      '비교할 주문번호가 없습니다.',

    target:
      '미분류',

    saleNumber:
      purchaseRow.saleNumber,

    orderNumber:
      purchaseRow.orderNumber,

    purchaseModel:
      purchaseRow.model,

    compareModel: '',

    purchaseQuantity:
      purchaseRow.normalized
        .quantity,

    compareQuantity: 0,

    purchaseRowNumber:
      purchaseRow.excelRowNumber,

    compareRowNumbers: ''
  };
}


/**
 * 판매번호 + 주문번호 키
 */
function createOrderMatchKey(
  saleNumber,
  orderNumber
) {
  return (
    String(
      saleNumber || ''
    ) +
    '||' +
    String(
      orderNumber || ''
    )
  );
}


/**
 * 판매번호 + 주문번호 + 모델 키
 */
function createFullMatchKey(
  saleNumber,
  orderNumber,
  model
) {
  return (
    createOrderMatchKey(
      saleNumber,
      orderNumber
    ) +
    '||' +
    String(
      model || ''
    )
  );
}


/**
 * 수량 합계
 */
function sumComparisonQuantity(
  rows
) {
  return rows.reduce(
    (
      total,
      row
    ) =>
      total +
      Number(
        row.normalized
          .quantity || 0
      ),
    0
  );
}


/**
 * 모델명 목록
 */
function getUniqueModelNames(
  rows
) {
  return [
    ...new Set(
      rows
        .map(row =>
          String(
            row.model || ''
          ).trim()
        )
        .filter(Boolean)
    )
  ];
}


/**
 * 비교 대상 표시명
 */
function getComparisonSourceLabel(
  sourceType
) {
  if (
    sourceType === 'online'
  ) {
    return '온라인';
  }

  if (
    sourceType === 'direct'
  ) {
    return '직배';
  }

  return sourceType;
}
