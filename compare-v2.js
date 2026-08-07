console.log(
  'compare-v2.js 로드 완료'
);

/**
 * BOBO 발주 검수 Dashboard V2
 * 주문 비교 엔진
 */

/**
 * 전체 발주 검수 실행
 *
 * 온라인 주문번호:
 * 온라인 파일 우선 → 없으면 직배 파일 검색
 *
 * 직배 주문번호:
 * 직배 파일 우선 → 없으면 온라인 파일 검색
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

  purchaseRows.forEach(
    purchaseRow => {
      const onlineOrderNumber =
        purchaseRow.normalized
          .onlineOrderNumber;

      const directOrderNumber =
        purchaseRow.normalized
          .directOrderNumber;

      /*
       * 온라인 주문번호가 있으면
       * 온라인 우선, 직배 보조 검색
       */
      if (onlineOrderNumber) {
        results.push(
          comparePurchaseRow({
            purchaseRow,
            expectedOrderNumber:
              onlineOrderNumber,

            preferredType:
              'online',

            primaryIndex:
              onlineIndex,

            secondaryIndex:
              directIndex
          })
        );
      }

      /*
       * 직배 주문번호가 있으면
       * 직배 우선, 온라인 보조 검색
       */
      if (directOrderNumber) {
        /*
         * 온라인 주문번호와 직배 주문번호가
         * 완전히 같은 경우에는 중복 검수를 막습니다.
         */
        if (
          directOrderNumber ===
          onlineOrderNumber
        ) {
          return;
        }

        results.push(
          comparePurchaseRow({
            purchaseRow,
            expectedOrderNumber:
              directOrderNumber,

            preferredType:
              'direct',

            primaryIndex:
              directIndex,

            secondaryIndex:
              onlineIndex
          })
        );
      }
    }
  );

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
 *
 * 주문번호로 먼저 검색한 다음
 * 판매번호, 모델, 수량을 검증합니다.
 */
function comparePurchaseRow({
  purchaseRow,
  expectedOrderNumber,
  preferredType,
  primaryIndex,
  secondaryIndex
}) {
  const normalizedOrderNumber =
    normalizeCompareValue(
      expectedOrderNumber
    );

  const purchaseSaleNumber =
    normalizeCompareValue(
      purchaseRow.normalized
        .saleNumber
    );

  const purchaseModel =
    purchaseRow.normalized
      .model;

  const purchaseQuantity =
    purchaseRow.normalized
      .quantity;

  /*
   * 우선 파일에서 주문번호 검색
   */
  let orderCandidates =
    primaryIndex.get(
      normalizedOrderNumber
    ) || [];

  let actualSourceType =
    preferredType;

  /*
   * 우선 파일에 없으면
   * 다른 파일에서 다시 검색
   */
  if (
    orderCandidates.length === 0
  ) {
    orderCandidates =
      secondaryIndex.get(
        normalizedOrderNumber
      ) || [];

    actualSourceType =
      preferredType === 'online'
        ? 'direct'
        : 'online';
  }

  /*
   * 온라인과 직배 어디에도 없는 경우
   */
  if (
    orderCandidates.length === 0
  ) {
    const missingCategory =
      preferredType === 'online'
        ? 'onlineMissing'
        : 'directMissing';

    return {
      status: 'error',

      categories: [
        missingCategory
      ],

      reason:
        getComparisonSourceLabel(
          preferredType
        ) +
        ' 및 대체 파일에서 주문번호를 찾지 못했습니다.',

      target:
        getComparisonSourceLabel(
          preferredType
        ),

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

  const categories = [];
  const reasons = [];

  /*
   * 주문번호로 찾은 행 중
   * 판매번호가 같은 행 확인
   */
  const saleMatchedCandidates =
    orderCandidates.filter(
      sourceRow =>
        normalizeCompareValue(
          sourceRow.normalized
            .saleNumber
        ) ===
        purchaseSaleNumber
    );

  /*
   * 판매번호가 같은 행이 있으면
   * 그 행만 모델·수량 비교에 사용합니다.
   *
   * 판매번호가 모두 다르면
   * 주문번호 후보 전체를 사용하고
   * 판매번호 불일치로 표시합니다.
   */
  const comparisonCandidates =
    saleMatchedCandidates.length > 0
      ? saleMatchedCandidates
      : orderCandidates;

  if (
    saleMatchedCandidates.length === 0
  ) {
    categories.push(
      'saleNumberMismatch'
    );

    reasons.push(
      '판매번호 불일치'
    );
  }

  /*
   * 모델명 전체가 같은 행 확인
   */
  const modelCandidates =
    comparisonCandidates.filter(
      sourceRow =>
        sourceRow.normalized
          .model ===
        purchaseModel
    );

  if (
    modelCandidates.length === 0
  ) {
    categories.push(
      'modelMismatch'
    );

    reasons.push(
      '모델 불일치'
    );

    return {
      status: 'error',

      categories:
        [...new Set(categories)],

      reason:
        [...new Set(reasons)]
          .join(' / '),

      target:
        getComparisonTargetLabel(
          preferredType,
          actualSourceType
        ),

      saleNumber:
        purchaseRow.saleNumber,

      orderNumber:
        expectedOrderNumber,

      purchaseModel:
        purchaseRow.model,

      compareModel:
        getUniqueModelNames(
          comparisonCandidates
        ).join(', '),

      purchaseQuantity,

      compareQuantity:
        sumComparisonQuantity(
          comparisonCandidates
        ),

      purchaseRowNumber:
        purchaseRow.excelRowNumber,

      compareRowNumbers:
        comparisonCandidates
          .map(row =>
            row.excelRowNumber
          )
          .join(', ')
    };
  }

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
   * 동일 주문번호·판매번호·모델이
   * 여러 행이면 중복 여부 확인
   *
   * 수량 합계가 발주 수량과 일치하더라도
   * 여러 행으로 나뉘어 있음을 표시합니다.
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

  /*
   * 원래 예상한 파일이 아니라
   * 다른 파일에서 발견된 경우 안내
   */
  if (
    actualSourceType !==
    preferredType
  ) {
    reasons.unshift(
      getComparisonSourceLabel(
        preferredType
      ) +
      ' 번호가 ' +
      getComparisonSourceLabel(
        actualSourceType
      ) +
      ' 파일에서 확인됨'
    );
  }

  const uniqueCategories =
    [...new Set(categories)];

  const uniqueReasons =
    [...new Set(reasons)];

  return {
    status:
      uniqueCategories.length === 0
        ? 'normal'
        : 'error',

    categories:
      uniqueCategories,

    reason:
      uniqueReasons.length === 0
        ? (
            actualSourceType ===
            preferredType
              ? '정상 일치'
              : getComparisonSourceLabel(
                  actualSourceType
                ) +
                ' 파일에서 정상 확인'
          )
        : uniqueReasons.join(' / '),

    target:
      getComparisonTargetLabel(
        preferredType,
        actualSourceType
      ),

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

/**
 * 주문번호·판매번호 비교용 정리
 */
function normalizeCompareValue(
  value
) {
  return String(
    value ?? ''
  )
    .replace(/\.0$/, '')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase();
}


/**
 * 실제 비교 파일 표시
 */
function getComparisonTargetLabel(
  preferredType,
  actualSourceType
) {
  const preferredLabel =
    getComparisonSourceLabel(
      preferredType
    );

  const actualLabel =
    getComparisonSourceLabel(
      actualSourceType
    );

  if (
    preferredType ===
    actualSourceType
  ) {
    return actualLabel;
  }

  return (
    actualLabel +
    ' (발주서 표기: ' +
    preferredLabel +
    ')'
  );
}
