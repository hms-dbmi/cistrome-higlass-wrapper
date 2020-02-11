/**
 * Create a path-based symbol icon
 * 
 * @method  createSymbolIcon
 * @author  Fritz Lekschas
 * @date    2016-10-09
 * @param   {Object}  el       D3 selected base element to where the symbols
 *   should be appended to.
 * @param   {String}  id       ID of the icon to be created.
 * @param   {Array}   paths    Array of path strings.
 * @param   {String}  viewBox  View box string.
 */
export function createSymbolIcon(el, id, paths, viewBox) {
    const symbol = el
        .append('symbol')
        .attr('id', id)
        .attr('viewBox', viewBox);
  
    paths.forEach(d =>
        symbol
            .append('path')
            .attr('d', d)
            .attr('fill', 'currentColor')
    );
}

export const SEARCH = {
    id: 'search',
    viewBox: '0 0 1792 1792',
    paths: [
        'M1216 832q0-185-131.5-316.5t-316.5-131.5-316.5 131.5-131.5 316.5 131.5 316.5 316.5 131.5 316.5-131.5 131.5-316.5zm512 832q0 52-38 90t-90 38q-54 0-90-38l-343-342q-179 124-399 124-143 0-273.5-55.5t-225-150-150-225-55.5-273.5 55.5-273.5 150-225 225-150 273.5-55.5 273.5 55.5 225 150 150 225 55.5 273.5q0 220-124 399l343 343q37 37 37 90z'
    ]
};

export const SORT_DESC = {
    id: 'sort_desc',
    viewBox: '0 0 1792 1792',
    paths: [
        'M1216 1568v192q0 14-9 23t-23 9h-256q-14 0-23-9t-9-23v-192q0-14 9-23t23-9h256q14 0 23 9t9 23zm-480-128q0 12-10 24l-319 319q-10 9-23 9-12 0-23-9l-320-320q-15-16-7-35 8-20 30-20h192v-1376q0-14 9-23t23-9h192q14 0 23 9t9 23v1376h192q14 0 23 9t9 23zm672-384v192q0 14-9 23t-23 9h-448q-14 0-23-9t-9-23v-192q0-14 9-23t23-9h448q14 0 23 9t9 23zm192-512v192q0 14-9 23t-23 9h-640q-14 0-23-9t-9-23v-192q0-14 9-23t23-9h640q14 0 23 9t9 23zm192-512v192q0 14-9 23t-23 9h-832q-14 0-23-9t-9-23v-192q0-14 9-23t23-9h832q14 0 23 9t9 23z'
    ]
};

export const SORT_ASC = {
    id: 'sort_asc',
    paths: [
        'M736 1440q0 12-10 24l-319 319q-10 9-23 9-12 0-23-9l-320-320q-15-16-7-35 8-20 30-20h192v-1376q0-14 9-23t23-9h192q14 0 23 9t9 23v1376h192q14 0 23 9t9 23zm1056 128v192q0 14-9 23t-23 9h-832q-14 0-23-9t-9-23v-192q0-14 9-23t23-9h832q14 0 23 9t9 23zm-192-512v192q0 14-9 23t-23 9h-640q-14 0-23-9t-9-23v-192q0-14 9-23t23-9h640q14 0 23 9t9 23zm-192-512v192q0 14-9 23t-23 9h-448q-14 0-23-9t-9-23v-192q0-14 9-23t23-9h448q14 0 23 9t9 23zm-192-512v192q0 14-9 23t-23 9h-256q-14 0-23-9t-9-23v-192q0-14 9-23t23-9h256q14 0 23 9t9 23z'
    ],
    viewBox: '0 0 1792 1792'
};

export const all = [
    SEARCH,
    SORT_DESC,
    SORT_ASC
];