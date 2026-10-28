import { createLayerMatchClient } from './client/layermatch.mjs';
import { supabaseConfig } from './config.js';

export const API = createLayerMatchClient(supabaseConfig);
