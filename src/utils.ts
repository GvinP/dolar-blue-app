import {parseDocument} from 'htmlparser2';
import {findAll, findOne, textContent} from 'domutils';

// Define the data structure for extracted information
export interface Cotizacion {
  title: string;
  compra?: string;
  venta?: string;
  porcentaje?: string;
}

// Sample HTML input (replace this with your dynamic HTML source)
// const html = `
// <div class="tile is-child">
//   <a class="title">Dólar blue</a>
//   <div class="values">
//     <div class="compra"><div class="val">$1195</div></div>
//     <div class="venta"><div class="val">$1215</div></div>
//     <div class="var-porcentaje"><div>0.00%</div></div>
//   </div>
// </div>
// <div class="tile is-child">
//   <a class="title">Dólar Oficial</a>
//   <div class="values">
//     <div class="compra"><div class="val">$1012,50</div></div>
//     <div class="venta"><div class="val">$1052,50</div></div>
//     <div class="var-porcentaje"><div>0.00%</div></div>
//   </div>
// </div>
// `;

// Function to extract cotizaciones
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

// Execute the function and log results
// const cotizaciones = extractCotizaciones(html);
// console.log(cotizaciones);

// import {parseDocument} from 'htmlparser2';
// import {findOne, findAll, textContent} from 'domutils';

// // Replace this with your HTML source
// const html = `
// <div class="tile is-child">
//   <a class="title">Dólar blue</a>
//   <div class="values">
//     <div class="compra"><div class="val">$1195</div></div>
//     <div class="venta"><div class="val">$1215</div></div>
//     <div class="var-porcentaje"><div>0.00%</div></div>
//   </div>
// </div>
// `;

// const extractData = html => {
//   const doc = parseDocument(html);

//   const tiles = findAll(
//     el => el.attribs && el.attribs.class?.includes('tile is-child'),
//     doc,
//   );
//   const data = tiles.map(tile => {
//     const title = textContent(
//       findOne(el => el.attribs && el.attribs.class === 'title', tile),
//     );
//     const compra = textContent(
//       findOne(el => el.attribs && el.attribs.class === 'val', tile),
//     );
//     const venta = textContent(
//       findAll(el => el.attribs && el.attribs.class === 'val', tile)[1],
//     );
//     const porcentaje = textContent(
//       findOne(el => el.attribs && el.attribs.class === 'var-porcentaje', tile),
//     );

//     return {title, compra, venta, porcentaje};
//   });

//   return data;
// };

// console.log(extractData(html));
