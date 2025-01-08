import {
  createSystem,
  defaultConfig,
} from "@chakra-ui/react";

const serifSystemFont = `-apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Cantarell, Ubuntu, roboto, noto, arial, sans-serif`;

export const system = createSystem(defaultConfig, {
  strictTokens: true,
  theme: {
    tokens: {
      fonts: {
        heading: { value: serifSystemFont },
        body: { value: serifSystemFont },
      },
    },
  },
});
