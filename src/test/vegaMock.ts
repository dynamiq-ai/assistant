export const loader = () => ({
  sanitize: async (uri: string) => ({ href: uri }),
});
