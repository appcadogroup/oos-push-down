
/**
 * Returns a minimal list of Shopify 'moves' to get from oldOrder -> newOrder.
 * Each element of oldOrder/newOrder is a product object with at least `id`.
 * 
 * @param {Array<{id:string}>} oldOrder
 * @param {Array<{id:string}>} newOrder
 * @returns {Array<{id:string, newPosition:number}>} 
 *          Minimal set of moves for Shopify collectionReorderProducts.
 */
export function buildMinimalMoves(oldOrder, newOrder) {
    // 1) Map each product ID to its final index in newOrder
    const finalIndexMap = new Map();
    newOrder.forEach((p, index) => {
      finalIndexMap.set(p.id, index);
    });
  
    // 2) Convert oldOrder into an array of final indices
    //    e.g. oldOrder[i] => positionInNewOrder
    const oldOrderFinalIndices = oldOrder.map(p => finalIndexMap.get(p.id));
  
    // 3) Find the LIS in oldOrderFinalIndices.
    //    We'll get a list of indices that are part of the LIS.
    //    The items in the LIS do NOT move. Everyone else must move.
  
    // 3a) We only need the *positions* that form the LIS, so we use a classic O(n log n) approach:
    const { lisSet } = findLIS(oldOrderFinalIndices);
  
    // 4) Build the "moves" for items NOT in the LIS, in ascending final index
    const moves = [];
    
    // Create an array of (productId, finalIndex)
    const productWithIndex = oldOrder.map((p, i) => ({
      id: p.id,
      finalIndex: oldOrderFinalIndices[i]
    }));
  
    // Filter to only those NOT in the LIS
    const outOfSequence = productWithIndex.filter((_, i) => !lisSet.has(i));
  
    // Sort them by finalIndex ascending
    outOfSequence.sort((a, b) => a.finalIndex - b.finalIndex);
  
    // 5) Create a move for each
    //    newPosition in Shopify is 1-based, so finalIndex + 1
    for (const { id, finalIndex } of outOfSequence) {
      moves.push({
        id,
        newPosition: String(finalIndex + 1)
      });
    }
  
    return moves;
  }
  
  
  /**
   * Returns the set of indices in the Longest Increasing Subsequence (LIS)
   * for the given array of numbers (classic O(n log n) approach).
   * 
   * We also return the length and the subsequence if needed, but
   * for minimal "moves," we just need the set of LIS indices.
   *
   * @param {number[]} arr
   * @return {{ length: number, lisSet: Set<number>, sequence: number[] }}
   */
  function findLIS(arr) {
    // "parents" keeps track of LIS chain parents for reconstructing the sequence
    const parents = new Array(arr.length).fill(-1);
  
    // "dp" will store the indices of the smallest tail for LIS of each length
    const dp = [];
    
    // This is used to reconstruct the LIS later
    const dpIndices = [];
  
    for (let i = 0; i < arr.length; i++) {
      const num = arr[i];
  
      // 1) Binary search in dp for the largest j where arr[dp[j]] < num
      let left = 0;
      let right = dp.length - 1;
  
      while (left <= right) {
        const mid = (left + right) >> 1;
        if (arr[dp[mid]] < num) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
  
      // "left" is now the length of LIS we can extend
      if (left > 0) {
        // parent of i is dp[left - 1]
        parents[i] = dp[left - 1];
      }
  
      if (left === dp.length) {
        dp.push(i);
      } else {
        dp[left] = i;
      }
      dpIndices[left] = i;
    }
  
    // The length of LIS is dp.length
    const length = dp.length;
  
    // Reconstruct the actual LIS
    let lisSet = new Set();
    let k = dp[dp.length - 1];
    const sequence = [];
    while (k !== -1) {
      sequence.push(k);
      lisSet.add(k);
      k = parents[k];
    }
    sequence.reverse(); // we built it backwards
  
    return {
      length,
      lisSet,
      sequence
    };
  }


  export function getTrulyMinimalMoves(firstArray, secondArray) {
    const idToTargetIndex = new Map();
    firstArray.forEach((item, index) => {
      idToTargetIndex.set(item.id, index);
    });
  
    // Build array of indexes in desired order
    const indexArray = secondArray.map(item => idToTargetIndex.get(item.id));
  
    // Find Longest Increasing Subsequence (LIS) over indexArray
    function findLISIndices(arr) {
      const piles = [];
      const predecessors = new Array(arr.length).fill(-1);
  
      for (let i = 0; i < arr.length; i++) {
        const num = arr[i];
        let left = 0;
        let right = piles.length;
        while (left < right) {
          const mid = (left + right) >> 1;
          if (arr[piles[mid]] < num) left = mid + 1;
          else right = mid;
        }
        if (left > 0) predecessors[i] = piles[left - 1];
        if (left === piles.length) piles.push(i);
        else piles[left] = i;
      }
  
      const lis = [];
      let k = piles[piles.length - 1];
      while (k >= 0) {
        lis.unshift(k);
        k = predecessors[k];
      }
      return new Set(lis);
    }
  
    const lisIndices = findLISIndices(indexArray);
  
    const moves = [];
    for (let i = 0; i < secondArray.length; i++) {
      if (!lisIndices.has(i)) {
        const item = secondArray[i];
        const correctIndex = idToTargetIndex.get(item.id);
        if (i !== correctIndex) {
          moves.push({
            id: item.id,
            newPosition: String(correctIndex),
            // title: item.title
          });
        }
      }
    }
  
    return moves;
  }

  export function getMinimalShopifyMoves(firstArray, secondArray) {
    const idToTitle = new Map(firstArray.map((item) => [item.id, item.title]));
    const targetOrder = firstArray.map((p) => p.id);
    const currentOrder = secondArray.map((p) => p.id);
  
    const targetIndexMap = new Map();
    targetOrder.forEach((id, i) => targetIndexMap.set(id, i));
  
    function findLIS(arr) {
      const piles = [];
      const prev = Array(arr.length).fill(-1);
  
      for (let i = 0; i < arr.length; i++) {
        let left = 0,
          right = piles.length;
        while (left < right) {
          const mid = (left + right) >> 1;
          if (arr[piles[mid]] < arr[i]) left = mid + 1;
          else right = mid;
        }
        if (left > 0) prev[i] = piles[left - 1];
        if (left === piles.length) piles.push(i);
        else piles[left] = i;
      }
  
      const result = [];
      let k = piles[piles.length - 1];
      while (k >= 0) {
        result.unshift(k);
        k = prev[k];
      }
      return new Set(result);
    }
  
    // Convert currentOrder to their target indices
    const currentIndices = currentOrder.map((id) => targetIndexMap.get(id));
    const lisIndices = findLIS(currentIndices);
  
    const moves = [];
    let workingOrder = [...currentOrder];
  
    for (let i = 0; i < workingOrder.length; i++) {
      if (!lisIndices.has(i)) {
        const id = workingOrder[i];
        const correctIndex = targetIndexMap.get(id);
  
        if (i !== correctIndex) {
          moves.push({
            id: id,
            newPosition: String(correctIndex),
            // title: idToTitle.get(id),
          });

  
          // Simulate Shopify-style reorder (remove + insert)
          const [moved] = workingOrder.splice(i, 1);
          workingOrder.splice(correctIndex, 0, moved);
  
          // After move, re-calculate LIS since workingOrder has changed
          const reindexed = workingOrder.map((id) => targetIndexMap.get(id));
          lisIndices.clear();
          findLIS(reindexed).forEach((index) => lisIndices.add(index));
  
          // Restart from beginning to keep in sync with updated workingOrder
          i = -1;
        }
      }
    }
  
    return moves;
  }
  