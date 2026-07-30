declare module '@env' {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
}

declare module '*.ttf' {
  const value: number;
  export default value;
}
