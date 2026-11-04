/**
 * RIZKAY személyes beállításai. Csak nyilvános Supabase publishable/anon kulcs szerepelhet itt.
 * Soha ne tedd ide a Supabase service_role vagy sb_secret_... kulcsot!
 */
export const CONFIG = {
  studioName: 'RIZKAY',
  email: '', // ide írd a kapcsolati e-mail-címed (kötelező az ajánlatkérő űrlaphoz)
  instagramUrl: '', // opcionális: https://www.instagram.com/...
  whatsappNumber: '', // opcionális, csak számok: 41791234567
  supabaseUrl: 'https://mkyqnpeoyfbnlvisxyjl.supabase.co/rest/v1/', // pl. https://projektazonosito.supabase.co
  supabasePublishableKey: 'sb_publishable_YO37nVaia61CMgGVWYamhw_2avokIvm', // sb_publishable_... vagy legacy anon kulcs
  bucketName: 'studio-audio',
  maxFileSizeMb: 45,
};
