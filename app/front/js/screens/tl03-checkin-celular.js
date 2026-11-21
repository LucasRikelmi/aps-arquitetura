// TL-03 Check-in no celular
import { montarCheckin } from './tl02-checkin.js';

export const telaCheckinCelular = ctx => montarCheckin(ctx, { celular: true });
