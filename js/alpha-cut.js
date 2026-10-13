(function(){'use strict';
const ns='http://www.w3.org/2000/svg';
function node(tag,attrs={},txt){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(txt!==undefined)e.textContent=txt;return e;}
function add(svg,tag,attrs,txt){const e=node(tag,attrs,txt);svg.append(e);return e;}
function math(el,tex){if(window.katex)katex.render(tex,el,{throwOnError:true,displayMode:false,output:'htmlAndMathml',strict:'ignore'});else el.textContent=tex;}
function axes(svg,W,H){const left=85,right=W-55,top=55,bottom=H-125;add(svg,'line',{x1:left,y1:bottom,x2:right,y2:bottom,stroke:'#81918d','stroke-width':2});add(svg,'line',{x1:left,y1:bottom,x2:left,y2:top-20,stroke:'#81918d','stroke-width':2});[0,.25,.5,.75,1].forEach(v=>{const y=bottom-v*(bottom-top);add(svg,'line',{x1:left,y1:y,x2:right,y2:y,stroke:'#dfe5dc','stroke-dasharray':v===0?'0':'4 7'});add(svg,'text',{x:left-17,y:y+7,'text-anchor':'end',fill:'#61777a','font-size':21},v);});add(svg,'text',{x:left-25,y:top-25,'font-size':25,fill:'#132c3a',class:'svg-math'},'μA(x)');add(svg,'text',{x:right+15,y:bottom+8,'font-size':25,class:'svg-math'},'x');return {left,right,top,bottom,width:right-left,height:bottom-top};}
function triangle(svg,lambda,strong,W=1050,H=570,multiple=false){svg.replaceChildren();const a=axes(svg,W,H);const x=v=>a.left+v/4*a.width,y=v=>a.bottom-v*a.height;
 add(svg,'path',{d:`M ${x(0)} ${y(0)} L ${x(2)} ${y(1)} L ${x(4)} ${y(0)} Z`,fill:'#dbe5d7',stroke:'none'});
 add(svg,'path',{d:`M ${x(0)} ${y(0)} L ${x(2)} ${y(1)} L ${x(4)} ${y(0)}`,fill:'none',stroke:'#183d43','stroke-width':5,'stroke-linejoin':'round'});
 [0,1,2,3,4].forEach(v=>add(svg,'text',{x:x(v),y:a.bottom+33,'text-anchor':'middle','font-size':22,fill:'#61777a'},v));
 const layer=multiple?add(svg,'g',{'data-step':1,class:'reveal'}):svg;const vals=multiple?[.2,.4,.6,.8]:[lambda/1000];vals.forEach((v,i)=>{const c=multiple?'#087f72':strong?'#366ab5':'#087f72';const xl=x(2*v),xr=x(4-2*v),yy=y(v);
 const line=add(layer,'line',{x1:a.left,y1:yy,x2:a.right,y2:yy,stroke:c,'stroke-width':2.5,'stroke-dasharray':'9 7'});if(!multiple)line.setAttribute('data-threshold','true');
 add(layer,'line',{x1:xl,y1:yy,x2:xr,y2:yy,stroke:c,'stroke-width':6});[xl,xr].forEach(xx=>add(layer,'circle',{cx:xx,cy:yy,r:8,fill:strong?'#fffefa':c,stroke:c,'stroke-width':3}));
 if(multiple){add(layer,'text',{x:xr+18,y:yy+7,'font-size':21,fill:c},`λ = ${v}`);}else{add(layer,'rect',{x:a.right-155,y:yy-35,width:157,height:33,rx:6,fill:'#fffefa'});add(layer,'text',{x:a.right-13,y:yy-10,'text-anchor':'end',fill:c,'font-size':24},`λ = ${Fuzzy.fmtLevel(lambda)}`);
 [xl,xr].forEach(xx=>add(layer,'line',{x1:xx,y1:yy+10,x2:xx,y2:a.bottom+62,stroke:c,'stroke-width':1.5,'stroke-dasharray':'5 6'}));
 add(layer,'line',{x1:xl,y1:a.bottom+77,x2:xr,y2:a.bottom+77,stroke:c,'stroke-width':7});[xl,xr].forEach(xx=>add(layer,'circle',{cx:xx,cy:a.bottom+77,r:8,fill:strong?'#fffefa':c,stroke:c,'stroke-width':3}));
 add(layer,'text',{x:a.left-13,y:a.bottom+85,'text-anchor':'end','font-size':24,fill:c,class:'svg-math'},strong?'Aλ⁺':'Aλ');}
 });return a;}
let lambda=600,strong=false,raf=0,playing=false,elapsed=0,last=0;
const plot=document.getElementById('cut-plot'),slider=document.getElementById('lambda-slider');
function render(){triangle(plot,lambda,strong);slider.value=lambda;document.getElementById('lambda-value').textContent=Fuzzy.fmtLevel(lambda);document.getElementById('cut-normal').classList.toggle('selected',!strong);document.getElementById('cut-strong').classList.toggle('selected',strong);document.getElementById('cut-description').textContent=strong?'等于阈值的边界点不属于截集。':'等于阈值的边界点属于截集。';const l=Fuzzy.fmtLevel(2*lambda),r=Fuzzy.fmtLevel(4000-2*lambda);const tex=strong&&lambda===1000?'A_1^+=\\varnothing':`${strong?'A_\\lambda^+':'A_\\lambda'}=${strong?'(':'['}${l},\\ ${r}${strong?')':']'}`;math(document.getElementById('cut-interval'),tex);}
function pause(){playing=false;cancelAnimationFrame(raf);document.getElementById('cut-sweep').textContent='播放阈值';}
function tick(t){if(!playing)return;if(last)elapsed+=t-last;last=t;lambda=Math.round(500+450*Math.sin(elapsed/1800));render();raf=requestAnimationFrame(tick);}
function play(){if(playing){pause();return;}playing=true;last=0;document.getElementById('cut-sweep').textContent='暂停阈值';raf=requestAnimationFrame(tick);}
function reset(){pause();lambda=600;strong=false;elapsed=0;render();}
slider.addEventListener('input',()=>{pause();lambda=Number(slider.value);render();});document.getElementById('cut-normal').onclick=()=>{strong=false;render();};document.getElementById('cut-strong').onclick=()=>{strong=true;render();};document.getElementById('cut-sweep').onclick=play;document.getElementById('cut-reset').onclick=reset;
let dragging=false;function drag(e){const p=plot.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(plot.getScreenCTM().inverse());lambda=Math.max(0,Math.min(1000,Math.round((445-q.y)/390*1000)));render();}
plot.addEventListener('pointerdown',e=>{pause();dragging=true;plot.setPointerCapture(e.pointerId);drag(e);});plot.addEventListener('pointermove',e=>{if(dragging)drag(e);});plot.addEventListener('pointerup',()=>dragging=false);plot.addEventListener('pointercancel',()=>dragging=false);
triangle(document.getElementById('intro-plot'),600,false,900,650,true);render();
window.Graphics={node,add,math,axes,triangle};window.CutDemo={render,pause,play,reset,get state(){return {lambda,strong,playing};}};
})();
