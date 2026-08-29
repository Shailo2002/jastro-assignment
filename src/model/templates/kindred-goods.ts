import type { TemplateDocument } from '../document'
import { buildTemplateDocument, type ElementSeed } from '../template-builder'

/**
 * "Kindred Goods" - a storefront.
 *
 * Commerce structure end to end: an announcement bar, a shop header with nav
 * and cart, a three-up product grid where each card carries its own image,
 * price, and add-to-cart action, and a newsletter strip.
 */

const CANVAS = '#faf6f0'
const SURFACE = '#fffdf9'
const BORDER = '#e8d8c6'
const HEADING = '#2b241e'
const BODY = '#6f6357'
const MUTED = '#93856f'
const ACCENT = '#b4511a'

interface ProductSeedInput {
  readonly index: number
  readonly image: string
  readonly imageAlt: string
  readonly name: string
  readonly maker: string
  readonly price: string
}

function productCard(product: ProductSeedInput): readonly ElementSeed[] {
  const cardId = `shop.product.${product.index}`
  return [
    {
      id: cardId,
      type: 'card',
      parentId: 'shop.grid',
      childIds: [`${cardId}.image`, `${cardId}.name`, `${cardId}.maker`, `${cardId}.buy`],
      base: {
        surface: { background: SURFACE, borderColor: BORDER, borderWidth: 1, borderRadius: 14 },
        spacing: { padding: { top: 16, right: 16, bottom: 18, left: 16 }, gap: 8 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
    },
    {
      id: `${cardId}.image`,
      type: 'image',
      parentId: cardId,
      base: {
        content: { imageSrc: product.image, imageAlt: product.imageAlt },
        size: { width: { value: 100, unit: '%' } },
        surface: { borderRadius: 10 },
      },
    },
    {
      id: `${cardId}.name`,
      type: 'heading',
      parentId: cardId,
      base: {
        content: { text: product.name },
        typography: { fontSize: 18, fontWeight: 700, lineHeight: 1.3, color: HEADING },
        spacing: { margin: { top: 6 } },
      },
    },
    {
      id: `${cardId}.maker`,
      type: 'text',
      parentId: cardId,
      base: {
        content: { text: product.maker },
        typography: { fontSize: 14, lineHeight: 1.5, color: MUTED },
      },
    },
    {
      id: `${cardId}.buy`,
      type: 'container',
      parentId: cardId,
      childIds: [`${cardId}.price`, `${cardId}.add`],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        spacing: { margin: { top: 6 } },
      },
    },
    {
      id: `${cardId}.price`,
      type: 'text',
      parentId: `${cardId}.buy`,
      base: {
        content: { text: product.price },
        typography: { fontSize: 18, fontWeight: 700, color: ACCENT },
      },
    },
    {
      id: `${cardId}.add`,
      type: 'button',
      parentId: `${cardId}.buy`,
      base: {
        content: { text: 'Add to cart', accessibleLabel: `Add ${product.name} to cart` },
        typography: { fontSize: 14, fontWeight: 600, color: HEADING },
        surface: { background: 'transparent', borderColor: '#ddccb9', borderWidth: 1, borderRadius: 8 },
        spacing: { padding: { top: 9, right: 16, bottom: 9, left: 16 } },
        size: { minHeight: { value: 40, unit: 'px' } },
      },
    },
  ]
}

function buildSeeds(): readonly ElementSeed[] {
  return [
    /* ------------------------------- promo ------------------------------- */
    {
      id: 'promo.section',
      type: 'section',
      parentId: null,
      childIds: ['promo.text'],
      base: {
        content: { accessibleLabel: 'Announcement' },
        surface: { background: ACCENT },
        spacing: { padding: { top: 10, right: 24, bottom: 10, left: 24 } },
        layout: { display: 'flex', flexDirection: 'row', justifyContent: 'center' },
        typography: { textAlign: 'center' },
      },
    },
    {
      id: 'promo.text',
      type: 'text',
      parentId: 'promo.section',
      base: {
        content: { text: 'Autumn drop is live · Free shipping on orders over $80' },
        typography: { fontSize: 13, fontWeight: 600, letterSpacing: 0.3, color: '#fff7ef' },
      },
    },

    /* ------------------------------- header ------------------------------- */
    {
      id: 'header.section',
      type: 'section',
      parentId: null,
      childIds: ['header.brand', 'header.nav', 'header.cart'],
      base: {
        content: { accessibleLabel: 'Shop header' },
        surface: { background: CANVAS, borderColor: BORDER, borderWidth: 1 },
        spacing: { padding: { top: 20, right: 48, bottom: 20, left: 48 }, gap: 24 },
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 14, right: 16, bottom: 14, left: 16 }, gap: 12 } },
      },
    },
    {
      id: 'header.brand',
      type: 'heading',
      parentId: 'header.section',
      base: {
        content: { text: 'Kindred Goods' },
        typography: { fontSize: 20, fontWeight: 700, color: HEADING },
      },
    },
    {
      id: 'header.nav',
      type: 'container',
      parentId: 'header.section',
      childIds: ['header.nav.shop', 'header.nav.makers', 'header.nav.journal'],
      base: {
        layout: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
        spacing: { gap: 20 },
      },
      overrides: { mobile: { spacing: { gap: 12 } } },
    },
    {
      id: 'header.nav.shop',
      type: 'text',
      parentId: 'header.nav',
      base: { content: { text: 'Shop' }, typography: { fontSize: 14, fontWeight: 600, color: HEADING } },
    },
    {
      id: 'header.nav.makers',
      type: 'text',
      parentId: 'header.nav',
      base: { content: { text: 'Makers' }, typography: { fontSize: 14, color: BODY } },
    },
    {
      id: 'header.nav.journal',
      type: 'text',
      parentId: 'header.nav',
      base: { content: { text: 'Journal' }, typography: { fontSize: 14, color: BODY } },
    },
    {
      id: 'header.cart',
      type: 'badge',
      parentId: 'header.section',
      base: {
        content: { text: 'Cart · 2' },
        typography: { fontSize: 13, fontWeight: 600, color: ACCENT },
        surface: { background: SURFACE, borderColor: BORDER, borderWidth: 1, borderRadius: 999 },
        spacing: { padding: { top: 7, right: 14, bottom: 7, left: 14 } },
      },
    },

    /* -------------------------------- shop -------------------------------- */
    {
      id: 'shop.section',
      type: 'section',
      parentId: null,
      childIds: ['shop.heading', 'shop.sub', 'shop.grid'],
      base: {
        content: { accessibleLabel: 'New arrivals' },
        surface: { background: CANVAS },
        spacing: { padding: { top: 48, right: 48, bottom: 56, left: 48 }, gap: 12 },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
      },
      overrides: {
        mobile: { spacing: { padding: { top: 32, right: 16, bottom: 40, left: 16 } } },
      },
    },
    {
      id: 'shop.heading',
      type: 'heading',
      parentId: 'shop.section',
      base: {
        content: { text: 'New arrivals' },
        typography: { fontSize: 34, fontWeight: 700, lineHeight: 1.15, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 26 } } },
    },
    {
      id: 'shop.sub',
      type: 'text',
      parentId: 'shop.section',
      base: {
        content: { text: 'Made in small numbers by independent makers. When a piece is gone, it is gone.' },
        typography: { fontSize: 16, lineHeight: 1.6, color: BODY },
        size: { maxWidth: { value: 560, unit: 'px' } },
      },
    },
    {
      id: 'shop.grid',
      type: 'container',
      parentId: 'shop.section',
      childIds: ['shop.product.1', 'shop.product.2', 'shop.product.3'],
      base: {
        layout: { display: 'grid', gridColumns: 3, alignItems: 'stretch' },
        spacing: { gap: 20, margin: { top: 12 } },
      },
      overrides: {
        tablet: { layout: { gridColumns: 3 }, spacing: { gap: 14 } },
        mobile: { layout: { gridColumns: 1 }, spacing: { gap: 14 } },
      },
    },
    ...productCard({
      index: 1,
      image: '/template/kindred-vase.svg',
      imageAlt: 'A terracotta hand-thrown stoneware vase on a cream background.',
      name: 'Ridge vase',
      maker: 'Hand-thrown stoneware · Alba Ceramics',
      price: '$64',
    }),
    ...productCard({
      index: 2,
      image: '/template/kindred-throw.svg',
      imageAlt: 'A folded wool throw with woven terracotta stripes.',
      name: 'Field throw',
      maker: 'Undyed loomed wool · Two Rivers Mill',
      price: '$98',
    }),
    ...productCard({
      index: 3,
      image: '/template/kindred-lamp.svg',
      imageAlt: 'A paper table lamp with a warm glow and a brass stem.',
      name: 'Paper lamp',
      maker: 'Washi shade, brass stem · Studio Hoshi',
      price: '$120',
    }),

    /* ----------------------------- newsletter ----------------------------- */
    {
      id: 'newsletter.section',
      type: 'section',
      parentId: null,
      childIds: ['newsletter.heading', 'newsletter.body', 'newsletter.button'],
      base: {
        content: { accessibleLabel: 'Newsletter' },
        surface: { background: '#f4ede3', borderColor: BORDER, borderWidth: 1, borderRadius: 16 },
        spacing: {
          padding: { top: 48, right: 64, bottom: 48, left: 64 },
          gap: 12,
          margin: { left: 48, right: 48 },
        },
        layout: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
        typography: { textAlign: 'center' },
      },
      overrides: {
        mobile: {
          spacing: { padding: { top: 28, right: 20, bottom: 28, left: 20 }, margin: { left: 16, right: 16 } },
          layout: { alignItems: 'stretch' },
        },
      },
    },
    {
      id: 'newsletter.heading',
      type: 'heading',
      parentId: 'newsletter.section',
      base: {
        content: { text: 'Join the next drop.' },
        typography: { fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: HEADING },
      },
      overrides: { mobile: { typography: { fontSize: 22 } } },
    },
    {
      id: 'newsletter.body',
      type: 'text',
      parentId: 'newsletter.section',
      base: {
        content: { text: 'Pieces are made in small numbers. Hear first when new work arrives.' },
        typography: { fontSize: 15, lineHeight: 1.6, color: BODY },
      },
    },
    {
      id: 'newsletter.button',
      type: 'button',
      parentId: 'newsletter.section',
      base: {
        content: { text: 'Get early access', href: 'https://example.com/newsletter', accessibleLabel: 'Get early access' },
        typography: { fontSize: 15, fontWeight: 600, color: '#fff7ef' },
        surface: { background: ACCENT, borderRadius: 8, borderWidth: 0, borderColor: 'transparent' },
        spacing: { padding: { top: 12, right: 22, bottom: 12, left: 22 } },
        size: { minHeight: { value: 44, unit: 'px' } },
      },
    },
  ]
}

export function createKindredGoodsDocument(): TemplateDocument {
  return buildTemplateDocument({
    documentId: 'kindred-goods-storefront',
    rootElementIds: ['promo.section', 'header.section', 'shop.section', 'newsletter.section'],
    seeds: buildSeeds(),
  })
}
