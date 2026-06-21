const fs = require('fs');
const path = require('path');
const env = require('../config/env');

function getUploadsDir() {
  return path.join(__dirname, '..', '..', env.uploadDir);
}

function persistMarketplaceImage(value = '') {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const dataUrlMatch = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(raw);
  if (!dataUrlMatch) {
    return raw;
  }

  const mime = dataUrlMatch[1].toLowerCase();
  const extension = mime.includes('png')
    ? 'png'
    : mime.includes('webp')
      ? 'webp'
      : mime.includes('gif')
        ? 'gif'
        : 'jpg';
  const filename = `marketplace-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const uploadsDir = getUploadsDir();

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(dataUrlMatch[2], 'base64'));
  return `/uploads/${filename}`;
}

function normalizeMarketplaceAdStatus(ad) {
  if (!ad || ad.status === 'paused' || ad.status === 'draft') {
    return ad?.status || 'draft';
  }

  const now = Date.now();
  const startsAt = ad.starts_at || ad.startsAt;
  const endsAt = ad.ends_at || ad.endsAt;
  const startMs = startsAt ? new Date(`${startsAt}T00:00:00`).getTime() : null;
  const endMs = endsAt ? new Date(`${endsAt}T23:59:59`).getTime() : null;

  if (endMs && endMs < now) {
    return 'expired';
  }
  if (startMs && startMs > now && ad.status === 'active') {
    return 'scheduled';
  }
  return ad.status || 'draft';
}

function formatMarketplacePrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '£0.00';
  }
  return `£${amount.toFixed(2)}`;
}

function getMarketplaceInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function mapMarketplaceAdProduct(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceGbp: Number(row.price_gbp),
    imageUrl: row.image_url || '',
    findMoreUrl: row.find_more_url,
    sortOrder: Number(row.sort_order || 0),
  };
}

function mapMarketplaceAd(row, products = []) {
  const startsAt = row.starts_at instanceof Date
    ? row.starts_at.toISOString().slice(0, 10)
    : row.starts_at;
  const endsAt = row.ends_at instanceof Date
    ? row.ends_at.toISOString().slice(0, 10)
    : row.ends_at;

  return {
    id: row.id,
    internalTitle: row.internal_title,
    status: normalizeMarketplaceAdStatus({
      status: row.status,
      starts_at: startsAt,
      ends_at: endsAt,
    }),
    startsAt,
    endsAt,
    allowOnTop: Boolean(row.allow_on_top),
    targetTrades: Array.isArray(row.target_trades) ? row.target_trades : [],
    clientName: row.client_name,
    clientAddress: row.client_address || '',
    activityScope: row.activity_scope || '',
    isPaid: row.is_paid !== false,
    products: products.map(mapMarketplaceAdProduct),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMarketplaceAdFeedItem(ad) {
  const products = (ad.products || []).slice(0, 3).map((product) => ({
    title: product.title || 'Product',
    description: product.description || '',
    priceLabel: formatMarketplacePrice(product.priceGbp ?? product.price_gbp),
    findMoreUrl: product.findMoreUrl || product.find_more_url || '#',
    imageUrl: product.imageUrl || product.image_url || '',
  }));

  if (!products.length) {
    return null;
  }

  return {
    id: ad.id,
    type: 'marketplaceAd',
    createdAt: ad.createdAt || ad.created_at || `${ad.startsAt || ad.starts_at}T09:00:00.000Z`,
    allowOnTop: Boolean(ad.allowOnTop ?? ad.allow_on_top),
    clientName: ad.clientName || ad.client_name || 'Marketplace advertiser',
    clientAddress: ad.clientAddress || ad.client_address || '',
    activityScope: ad.activityScope || ad.activity_scope || '',
    isPaid: ad.isPaid !== false && ad.is_paid !== false,
    initials: getMarketplaceInitials(ad.clientName || ad.client_name),
    products,
  };
}

function filterMarketplaceAdsForWorker(ads = [], tradeInterests = []) {
  const now = Date.now();
  const interests = Array.isArray(tradeInterests)
    ? tradeInterests.map((trade) => String(trade).toLowerCase())
    : [];

  return ads.filter((ad) => {
    const status = normalizeMarketplaceAdStatus(ad);
    if (status !== 'active') {
      return false;
    }

    const startsAt = ad.startsAt || ad.starts_at;
    const endsAt = ad.endsAt || ad.ends_at;
    const startMs = startsAt ? new Date(`${startsAt}T00:00:00`).getTime() : null;
    const endMs = endsAt ? new Date(`${endsAt}T23:59:59`).getTime() : null;
    if (startMs && startMs > now) {
      return false;
    }
    if (endMs && endMs < now) {
      return false;
    }

    const targetTrades = Array.isArray(ad.targetTrades)
      ? ad.targetTrades
      : (Array.isArray(ad.target_trades) ? ad.target_trades : []);

    if (!targetTrades.length) {
      return true;
    }
    if (!interests.length) {
      return false;
    }

    return targetTrades.some((trade) => interests.includes(String(trade).toLowerCase()));
  });
}

function splitFeedMarketplaceAds(ads = []) {
  const mapped = ads.map((ad) => mapMarketplaceAdFeedItem(ad)).filter(Boolean);
  return {
    pinnedAds: mapped.filter((ad) => ad.allowOnTop),
    regularAds: mapped.filter((ad) => !ad.allowOnTop),
  };
}

async function fetchMarketplaceAdProducts(client, adId) {
  const result = await client.query(
    `SELECT id, ad_id, sort_order, title, description, price_gbp, image_url, find_more_url, created_at
     FROM marketplace_ad_products
     WHERE ad_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [adId]
  );
  return result.rows;
}

async function replaceMarketplaceAdProducts(client, adId, products = []) {
  await client.query('DELETE FROM marketplace_ad_products WHERE ad_id = $1', [adId]);

  for (const [index, product] of products.slice(0, 3).entries()) {
    const imageUrl = persistMarketplaceImage(product.imageUrl);
    await client.query(
      `INSERT INTO marketplace_ad_products (
         ad_id,
         sort_order,
         title,
         description,
         price_gbp,
         image_url,
         find_more_url
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        adId,
        index,
        product.title,
        product.description,
        product.priceGbp,
        imageUrl,
        product.findMoreUrl,
      ]
    );
  }
}

module.exports = {
  persistMarketplaceImage,
  normalizeMarketplaceAdStatus,
  mapMarketplaceAd,
  mapMarketplaceAdFeedItem,
  filterMarketplaceAdsForWorker,
  splitFeedMarketplaceAds,
  fetchMarketplaceAdProducts,
  replaceMarketplaceAdProducts,
};
