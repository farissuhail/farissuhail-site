/* Original motion design for Faris Suhail. Same deterministic frames in browser and MP4. */
(function (global) {
  'use strict';
  const C={bg:'#111214',paper:'#f4f1ea',muted:'#abb0b8',faint:'#343a45',blue:'#4d94ff',teal:'#3ddbd9',green:'#3ddc84',lime:'#a8e05f',gold:'#f5c451'};
  const palette=[C.blue,C.teal,C.green,C.lime];
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
  function text(ctx,value,x,y,size=20,color=C.paper,font='sans-serif',align='left'){
    ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.textAlign=align;ctx.fillText(value,x,y);
  }
  function wrap(ctx,value,x,y,maxWidth,size=20,color=C.paper,maxLines=3,font='sans-serif'){
    ctx.font=`${size}px ${font}`;ctx.textAlign='left';ctx.fillStyle=color;
    let lines=[],line='';for(const word of String(value).split(/\s+/)){let next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);
    lines=lines.slice(0,maxLines);lines.forEach((s,i)=>ctx.fillText(s,x,y+i*size*1.35));return lines.length;
  }
  function ring(ctx,x,y,r,color,alpha=1,start=-Math.PI/2,extent=Math.PI*2){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,r,start,start+extent);ctx.stroke();ctx.restore()}
  function chapter(r,t){return r.chapters.find(c=>t>=c.time&&t<c.end)||r.chapters[r.chapters.length-1]}
  function portrait(ctx,r,t,w,h,options={}){
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=C.bg;ctx.fillRect(0,0,w,h);ctx.scale(w/720,h/1280);
    const ch=chapter(r,t),n=r.units.length,foldStart=r.chapters.find(c=>c.kind==='fold').time,fold=options.explore?1:smooth((t-foldStart)/3);
    const pi=Number.isInteger(options.pairIndex)?options.pairIndex:(ch.kind==='pair'?ch.pairIndex:-1),p=r.pairs[pi];
    const intro=ch.kind==='intro',center=ch.kind==='centre',ending=ch.kind==='reflection',ringView=ch.kind==='fold'||ending;
    text(ctx,'FARIS SUHAIL  /  NAẒM',38,42,15,C.muted,'monospace');text(ctx,String(r.id).padStart(3,'0'),682,42,15,C.muted,'monospace','right');
    ctx.fillStyle=C.faint;ctx.fillRect(38,65,644,1);
    const headline=intro?r.hook:ch.kind==='sequence'?'Follow the movements in order.':center?'The proposed hinge.':ch.kind==='fold'?'The reading takes shape.':ending?'Return to the text.':p?`${r.units[p.a].label} ↔ ${r.units[p.b].label}   ${ch.title}`:ch.title;
    wrap(ctx,headline,38,118,644,37,C.paper,3,'Georgia,serif');
    text(ctx,'A simplified, interpretive study map',38,264,17,C.muted);
    const cx=360,cy=intro?775:655,outer=intro?202:257;
    const ringAlpha=intro||ringView?1:0;
    ctx.save();ctx.globalAlpha=ringAlpha;
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,116);glow.addColorStop(0,'#f5c45130');glow.addColorStop(1,'#f5c45100');ctx.fillStyle=glow;ctx.fillRect(cx-120,cy-120,240,240);
    r.pairs.forEach((pair,k)=>{const radius=outer-k*(n>7?48:62),col=palette[k%4];ring(ctx,cx,cy,radius,col,k===pi?1:.7);text(ctx,`${r.units[pair.a].label} · ${r.units[pair.a].range}`,cx,cy-radius-10,17,C.muted,'monospace','center');text(ctx,`${r.units[pair.b].label} · ${r.units[pair.b].range}`,cx,cy+radius+23,17,C.muted,'monospace','center')});
    ring(ctx,cx,cy,38,C.gold);text(ctx,'X',cx,cy+9,28,C.gold,'Georgia,serif','center');text(ctx,r.units[r.centreIndex].range,cx,cy+65,18,C.gold,'monospace','center');ctx.restore();
    if(intro){text(ctx,r.ar,360,357,63,C.paper,'"Segoe UI",Arial','center');text(ctx,r.name,360,419,39,C.paper,'Georgia,serif','center');wrap(ctx,r.intro,38,477,644,26,C.muted,3);}
    else if(!ringView){
      const gap=n>7?65:n>5?79:105,top=343;
      r.units.forEach((u,i)=>{const active=p?(i===p.a||i===p.b):center?i===r.centreIndex:true,y=top+i*gap,col=i===r.centreIndex?C.gold:p&&active?palette[pi%4]:C.paper;
        ctx.save();ctx.globalAlpha=(ch.kind==='sequence'?smooth((t-ch.time-i*.46)/.8):1)*(active?1:.38);
        ctx.fillStyle=C.bg;ctx.fillRect(39,y-25,642,gap-4);if(active&&(p||center)){ctx.fillStyle=col+'17';ctx.fillRect(39,y-25,642,gap-4)}
        text(ctx,u.label,50,y,21,col,'monospace');text(ctx,u.range,108,y,17,C.muted,'monospace');wrap(ctx,u.title,50,y+29,620,23,col,1);ctx.restore();});
      if(p){const ya=top+p.a*gap-8,yb=top+p.b*gap-8;ctx.strokeStyle=palette[pi%4];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(35,ya);ctx.lineTo(24,ya);ctx.lineTo(24,yb);ctx.lineTo(35,yb);ctx.stroke()}
    }
    if(ch.kind==='fold'&&fold<1){r.units.forEach((u,i)=>{const k=r.pairs.findIndex(p=>p.a===i||p.b===i),rad=k<0?0:outer-k*(n>7?48:62),target=cy+(i<r.centreIndex?-rad:rad),gap=n>7?65:n>5?79:105;ctx.fillStyle=k<0?C.gold:palette[k%4];ctx.beginPath();ctx.arc(90+(cx-90)*fold,343+i*gap+(target-343-i*gap)*fold,5,0,7);ctx.fill()})}
    ctx.fillStyle=C.faint;ctx.fillRect(38,1017,644,1);text(ctx,ch.kind.toUpperCase(),38,1051,15,C.gold,'monospace');wrap(ctx,ch.description,38,1088,644,25,C.paper,5);
    text(ctx,'Study labels · not Quran translations',38,1260,14,C.muted);text(ctx,'farissuhail.com',682,1260,14,C.muted,'monospace','right');ctx.restore();
  }
  function draw(ctx,r,t,w,h,options={}){
    if(w/h<1)return portrait(ctx,r,t,w,h,options);
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=C.bg;ctx.fillRect(0,0,w,h);
    // Design coordinates are 1280 × 720. Canvas scales uniformly to preserve type.
    const scale=Math.min(w/1280,h/720),ox=(w-1280*scale)/2,oy=(h-720*scale)/2;
    ctx.translate(ox,oy);ctx.scale(scale,scale);
    const ch=chapter(r,t), pairIndex=Number.isInteger(options.pairIndex)?options.pairIndex:(ch.kind==='pair'?ch.pairIndex:-1);
    const pair=r.pairs[pairIndex], n=r.units.length, cy=355,cx=958,outer=200;
    const foldChapter=r.chapters.find(c=>c.kind==='fold');
    const fold=options.explore?1:smooth((t-foldChapter.time)/3);
    const intro=ch.kind==='intro', centre=ch.kind==='centre', ending=ch.kind==='reflection';
    const introReveal=smooth(t/2);
    text(ctx,'FARIS SUHAIL  /  NAẒM',48,42,12,C.muted,'monospace');
    text(ctx,`${String(r.id).padStart(3,'0')}  ·  ${r.name}`,1232,42,13,C.paper,'sans-serif','right');
    ctx.fillStyle=C.faint;ctx.fillRect(48,62,1184,1);
    const headline=intro?r.hook:centre?'The reading turns at its hinge.':ch.kind==='fold'?'The correspondences become one shape.':ending?'Return to the text. Read it alongside.':ch.kind==='sequence'?'Follow the movements in order.':`${pair? r.units[pair.a].label+'  ↔  '+r.units[pair.b].label : ''}   ${ch.title}`;
    wrap(ctx,headline,48,112,1160,29,C.paper,2,'Georgia,serif');
    text(ctx,r.reading,48,164,13,C.muted);
    const rowGap=n>7?38:n>5?47:61,top=cy-(n-1)*rowGap/2;
    const foldToCentre=ch.kind==='fold'||ending||options.explore;
    // A centre glow belongs only to the proposed central unit, never a numeric midpoint claim.
    if(centre||fold>0||intro){
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,115);g.addColorStop(0,'#f5c45130');g.addColorStop(.45,'#f5c45112');g.addColorStop(1,'#f5c45100');ctx.fillStyle=g;ctx.fillRect(cx-120,cy-120,240,240);
    }
    // Quiet orbit guides appear from the opening; evidence is established in the readable list.
    r.pairs.forEach((p,k)=>{
      const radius=outer-k*(n>7?38:48),active=k===pairIndex;
      const shown=options.explore||intro||t>=r.chapters.find(c=>c.kind==='pair'&&c.pairIndex===k).time;
      ring(ctx,cx,cy,radius,shown?palette[k%4]:C.faint,active?1:shown?.64:.38);
      if(active){ring(ctx,cx,cy,radius,palette[k%4],1,-Math.PI/2,smooth((t-ch.time)/1.5)*Math.PI*2)}
      const a=r.units[p.a],b=r.units[p.b],aY=cy-radius,bY=cy+radius;
      text(ctx,`${a.label} · ${a.range}`,cx,aY-9,12,active?palette[k%4]:C.muted,'monospace','center');
      text(ctx,`${b.label} · ${b.range}`,cx,bY+20,12,active?palette[k%4]:C.muted,'monospace','center');
      if(shown){const a0=-Math.PI/2+(intro?t*.055:fold*.18),px=cx+radius*Math.cos(a0),py=cy+radius*Math.sin(a0);ctx.fillStyle=palette[k%4];ctx.beginPath();ctx.arc(px,py,3,0,7);ctx.fill()}
    });
    const core=r.units[r.centreIndex];
    ring(ctx,cx,cy,35,C.gold,centre||fold>0?1:.5);
    text(ctx,'X',cx,cy+8,23,C.gold,'Georgia,serif','center');
    text(ctx,core.range,cx,cy+57,12,C.gold,'monospace','center');
    if(intro){
      ctx.save();ctx.globalAlpha=introReveal;
      text(ctx,r.ar,48,280,60,C.paper,'"Segoe UI",Arial');
      text(ctx,r.name,48,333,38,C.paper,'Georgia,serif');
      wrap(ctx,r.intro,48,386,575,23,C.muted,4);
      text(ctx,`${r.units.length} movements  ·  ${r.pairs.length} mirror pairs  ·  one proposed hinge`,48,531,14,C.gold);
      ctx.restore();
    } else {
      // Index, verse reference and thematic label remain horizontal and legible.
      r.units.forEach((u,i)=>{
        const active=pair?(i===pair.a||i===pair.b):centre?i===r.centreIndex:!foldToCentre;
        let reveal=ch.kind==='sequence'?smooth((t-ch.time-i*.46)/.8):1;
        ctx.save();ctx.globalAlpha=reveal*(active?1:.47);
        const y=top+i*rowGap,col=i===r.centreIndex?C.gold:pairIndex>=0&&active?palette[pairIndex%4]:C.paper;
        if(active&&(pair||centre)){ctx.fillStyle=col+'14';ctx.fillRect(47,y-24,622,34)}
        text(ctx,u.label,58,y,16,col,'monospace');text(ctx,u.range,112,y,13,C.muted,'monospace');
        wrap(ctx,u.title,236,y,417,n>7?17:19,col,1);
        ctx.restore();
      });
      if(pair){
        const y1=top+pair.a*rowGap-7,y2=top+pair.b*rowGap-7;
        ctx.strokeStyle=palette[pairIndex%4];ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(42,y1);ctx.lineTo(26,y1);ctx.lineTo(26,y2);ctx.lineTo(42,y2);ctx.stroke();
      }
      // The fold is a real geometric movement, with the readable list retained as evidence.
      if(fold>0&&!ending){
        ctx.save();ctx.globalAlpha=Math.sin(fold*Math.PI)*.8;
        r.units.forEach((u,i)=>{const pr=r.pairs.findIndex(p=>p.a===i||p.b===i),rad=pr<0?0:outer-pr*(n>7?38:48),angle=i<r.centreIndex?-Math.PI/2:Math.PI/2;
          const x=620+(cx+Math.cos(angle)*rad-620)*fold,y=top+i*rowGap+(cy+Math.sin(angle)*rad-top-i*rowGap)*fold;
          ctx.fillStyle=i===r.centreIndex?C.gold:palette[Math.max(0,pr)%4];ctx.beginPath();ctx.arc(x,y,4,0,7);ctx.fill();});ctx.restore();
      }
    }
    ctx.fillStyle=C.faint;ctx.fillRect(48,584,1184,1);
    text(ctx,ending?'REFLECTION':centre?'PROPOSED CENTRE':ch.kind.toUpperCase(),48,614,11,C.gold,'monospace');
    wrap(ctx,ch.description,48,643,1155,19,C.paper,2);
    text(ctx,'Thematic study labels · one literary reading · centre ≠ verse-count midpoint',48,701,11,C.muted);
    text(ctx,'farissuhail.com / nazm',1232,701,11,C.muted,'monospace','right');
    ctx.restore();
  }
  global.NazmFilmEngine={draw,duration:r=>r.duration,chapters:r=>r.chapters,chapter};
})(typeof window!=='undefined'?window:globalThis);
