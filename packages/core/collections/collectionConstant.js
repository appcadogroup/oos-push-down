export const STATUS_FILTER = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    ALL: "ALL"
}

export const CollectionSorting = {
  ALPHA_ASC: 'ALPHA_ASC',
  ALPHA_DESC: 'ALPHA_DESC',
  BEST_SELLING: 'BEST_SELLING',
  CREATED: 'CREATED',
  CREATED_DESC: 'CREATED_DESC',
  MANUAL: 'MANUAL',
  PRICE_ASC: 'PRICE_ASC',
  PRICE_DESC: 'PRICE_DESC'
};

export const ProductCollectionSortValue = {
    [CollectionSorting.ALPHA_ASC]: {
        sortKey: "TITLE",
        reverse: false
    },
    [CollectionSorting.ALPHA_DESC]: {
        sortKey: "TITLE",
        reverse: true
    },
    [CollectionSorting.PRICE_ASC]: {
        sortKey: "PRICE",
        reverse: false
    },
    [CollectionSorting.PRICE_DESC]: {
        sortKey: "PRICE",
        reverse: true
    },
    [CollectionSorting.CREATED]: {
        sortKey: "CREATED",
        reverse: false
    },
    [CollectionSorting.CREATED_DESC]: {
        sortKey: "CREATED",
        reverse: true
    },
    [CollectionSorting.BEST_SELLING]: {
        sortKey: "BEST_SELLING",
    },
    [CollectionSorting.MANUAL]: {
        sortKey: "MANUAL",
    },
}