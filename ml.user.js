// ==UserScript==
// @name BC Map-Only Leash
// @namespace https://www.bondageprojects.com/
// @version 1.0.0
// @description Lets leashing and tether points work on the map in rooms that block leashing, but the leash never takes anyone out of the room. Both the leasher and the leashed player need this script.
// @author None
// @include /^https:\/\/(www\.)?bondageprojects\.elementfx\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @include /^https:\/\/(www\.)?bondage-europe\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @include /^https:\/\/(www\.)?bondageeurope\.com\/R\d+\/(BondageClub|\d+)(\/((index|\d+)\.html)?)?$/
// @include /^https:\/\/(www\.)?bondage-asia\.com\/club\/R\d+(\/((index|\d+)\.html)?)?$/
// @run-at document-end
// @grant none
// ==/UserScript==

setTimeout(function(){let n=document.createElement("script");n.setAttribute("language","JavaScript");n.setAttribute("crossorigin","anonymous");n.setAttribute("src","https://VeritySeven.github.io/tweaks/bc-map-only-leash.user.js");n.onload=()=>n.remove();document.head.appendChild(n);}, 1000);
