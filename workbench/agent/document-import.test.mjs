import {test} from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';
import {importDocument} from './document-import.mjs';
async function pdf(options={},write=doc=>{doc.text('First page: method and evidence.');doc.addPage();doc.text('Second page: results.');}){
 const doc=new PDFDocument(options),chunks=[];const result=new Promise(resolve=>{doc.on('data',b=>chunks.push(b));doc.on('end',()=>resolve(Buffer.concat(chunks).toString('base64')));});write(doc);doc.end();return result;
}
test('PDF import extracts selected pages with source page numbers and metadata',async()=>{
 const data=await pdf({info:{Title:'Paper title'}}),result=await importDocument({data,from:2,to:2});assert.equal(result.pageCount,2);assert.equal(result.title,'Paper title');assert.match(result.text,/第 2 页/);assert.match(result.text,/Second page/);assert.doesNotMatch(result.text,/First page/);assert.equal(result.hasText,true);assert.ok(result.warnings.some(w=>w.includes('仅提取')));
});
test('image-only PDF reports no text without fabricating OCR output',async()=>{
 const data=await pdf({},doc=>doc.rect(10,10,100,100).fill('#23313c')),result=await importDocument({data});assert.equal(result.hasText,false);assert.equal(result.pages[0].text,'');assert.ok(result.warnings.some(w=>w.includes('OCR')));
});
test('malformed, encrypted, invalid-range and cancelled documents fail explicitly',async()=>{
 await assert.rejects(importDocument({data:Buffer.from('not pdf').toString('base64')}),/有效/);
 const data=await pdf();await assert.rejects(importDocument({data,from:0}),/页码/);await assert.rejects(importDocument({data,from:3,to:3}),/总页数/);
 await assert.rejects(importDocument({data:await pdf({userPassword:'secret',ownerPassword:'owner'})}),/加密/);
 const controller=new AbortController();controller.abort();await assert.rejects(importDocument({data},{signal:controller.signal}));
 await assert.rejects(importDocument({data},{timeoutMs:1}),/超时/);
});
