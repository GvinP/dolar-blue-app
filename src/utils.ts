import {parseDocument} from 'htmlparser2';
import {findAll, findOne, textContent} from 'domutils';

export interface Cotizacion {
  title: string;
  compra?: string;
  venta?: string;
  porcentaje?: string;
}

export const fetchDolar = async () => {
  try {
    const response = await fetch(`https://www.dolarhoy.com?${new Date()}`);
    const blob = await response.blob();
    const text = await new Response(blob).text();
    const extractedCotizaciones = extractCotizaciones(text);

    return removeDuplicates(extractedCotizaciones).filter(
      cotizacion => cotizacion.title !== 'Won',
    );
  } catch (error) {
    console.error('fetch error', error);
  }
};

export const extractCotizaciones = (html: string): Cotizacion[] => {
  const doc = parseDocument(html);

  // Find all tiles with class "tile is-child"
  const tiles = findAll(
    el => el.attribs && el.attribs.class?.includes('tile is-child'),
    doc,
  );

  const cotizaciones: Cotizacion[] = tiles.map(tile => {
    const titleNode = findOne(
      el => el.attribs && el.attribs.class === 'title',
      tile,
    );

    // Extract title
    let title = '';
    if (titleNode) {
      title = textContent(titleNode);
    }

    // Extract compra value
    const compraNode = findAll(
      el => el.attribs && el.attribs.class === 'val',
      tile,
    )[0];

    let compra = '';
    if (compraNode) {
      compra = textContent(compraNode);
    }

    // Extract venta value (find second occurrence of 'val')
    const ventaNode = findAll(
      el => el.attribs && el.attribs.class === 'val',
      tile,
    )[1];
    let venta = '';
    if (ventaNode) {
      venta = textContent(ventaNode);
    }

    // Extract porcentaje
    const porcentajeNode = findAll(
      el => el.attribs && el.attribs.class === 'var-porcentaje',
      tile,
    )[0];
    let porcentaje = '';
    if (porcentajeNode) {
      porcentaje = textContent(porcentajeNode);
    }

    return {title, compra, venta, porcentaje};
  });

  return cotizaciones
    .filter(cotizacion => cotizacion.title)
    .filter(cotizacion => cotizacion.compra || cotizacion.venta);
};

export const removeDuplicates = (arr: Cotizacion[]): Cotizacion[] => {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (seen.has(item.title)) {
      return false; // Duplicate, so skip it
    }
    seen.add(item.title);
    return true; // Not a duplicate, so keep it
  });
};
