function t(e){return JSON.stringify(e).replaceAll("&","\\u0026").replaceAll("<","\\u003c").replaceAll(">","\\u003e").replaceAll("\u2028","\\u2028").replaceAll("\u2029","\\u2029")}import{jsx as a}from"react/jsx-runtime";function o({data:e,id:n}){return a("script",{dangerouslySetInnerHTML:{__html:t(e)},id:n,type:"application/ld+json"})}export{o as JsonLdScript};

//# debugId=983993BDF8E2F54A64756E2164756E21
