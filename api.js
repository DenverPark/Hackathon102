import { createLayerMatchClient } from './client/layermatch.mjs?v=0.8.0';
import { supabaseConfig } from './config.js';

export const API = createLayerMatchClient(supabaseConfig);
