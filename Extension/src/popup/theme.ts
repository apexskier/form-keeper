import {
  createSystem,
  defaultConfig,
  defineSlotRecipe,
} from "@chakra-ui/react";
import { listAnatomy } from "@chakra-ui/react/anatomy";

export const listSlotRecipe = defineSlotRecipe({
  className: "chakra-list",
  slots: listAnatomy.keys(),
  base: {
    root: {
      listStylePosition: "outside",
      paddingLeft: "20px",
    }
  },
});

const serifSystemFont = `-apple-system, BlinkMacSystemFont, avenir next, avenir, segoe ui, helvetica neue, helvetica, Cantarell, Ubuntu, roboto, noto, arial, sans-serif`;

export const system = createSystem(defaultConfig, {
  strictTokens: true,
  theme: {
    slotRecipes: { list: listSlotRecipe },
    tokens: {
      fonts: {
        heading: { value: serifSystemFont },
        body: { value: serifSystemFont },
      },
    },
  },
});
