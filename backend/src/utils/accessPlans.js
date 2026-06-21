function mapAccessPlan(row) {
  const priceGbp = Number(row.price_gbp);
  const discountPercent = Number(row.discount_percent);
  return {
    planKey: row.plan_key,
    displayName: row.display_name,
    priceGbp,
    discountPercent,
    effectivePriceGbp: Number((priceGbp * (1 - discountPercent / 100)).toFixed(2)),
    benefits: Array.isArray(row.benefits) ? row.benefits : [],
    updatedAt: row.updated_at,
  };
}

function mapSalesPlanTerms(row) {
  if (!row) {
    return {
      version: 0,
      content: '',
      updatedAt: null,
    };
  }

  return {
    version: row.version,
    content: row.content,
    updatedAt: row.created_at,
  };
}

async function getLatestSalesPlanTerms(pool) {
  const result = await pool.query(
    `SELECT version, content, created_at
     FROM sales_plan_terms_versions
     ORDER BY version DESC
     LIMIT 1`
  );
  return mapSalesPlanTerms(result.rows[0]);
}

module.exports = {
  mapAccessPlan,
  mapSalesPlanTerms,
  getLatestSalesPlanTerms,
};
