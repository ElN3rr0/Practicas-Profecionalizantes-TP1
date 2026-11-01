/**
 * Valores configurables de la economía del juego.
 * Cambiarlos acá ajusta recompensas y curva de niveles en todo el sistema.
 */

// Experiencia
export const XP_PER_CORRECT_ANSWER = 10;
export const XP_PER_GAME_COMPLETE = 20;
export const XP_PER_GAME_WIN = 30;

// Monedas
export const COINS_PER_CORRECT_ANSWER = 3;
export const COINS_PER_GAME_COMPLETE = 10;
export const COINS_PER_GAME_WIN = 15;

// Curva de niveles: nivel 1 -> 2 = 100 XP; cada nivel siguiente pide 50 más.
export const LEVEL_1_XP = 100;
export const LEVEL_XP_STEP = 50;
