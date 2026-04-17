/*
 * LUDO MASTER - Service Worker
 * © Mubin Makwa - All Rights Reserved
 */

const CACHE_NAME = 'ludo-master-v2.0.0';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './animations.js',
    './board.js',
    './dice.js',
    './game.js',
    './player.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => 
            Promise.all(
                names.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            )
        )
    );
});