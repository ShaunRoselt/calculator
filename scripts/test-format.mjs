import { formatNumber } from './utils.js';

console.log('formatNumber(1234567)=', formatNumber(1234567));
console.log('formatNumber(1234567.89)=', formatNumber(1234567.89));
console.log('formatNumber(-987654321)=', formatNumber(-987654321));
console.log('formatNumber(0.00123)=', formatNumber(0.00123));
console.log('formatNumber(1e30)=', formatNumber(1e30));
console.log('formatNumber(NaN)=', formatNumber(NaN));
console.log('formatNumber(Infinity)=', formatNumber(Infinity));
