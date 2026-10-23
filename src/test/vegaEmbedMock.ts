const vegaEmbed = jest.fn(async () => ({
  view: { finalize: jest.fn() },
  finalize: jest.fn(),
}));
export default vegaEmbed;
