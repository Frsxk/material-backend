import { Elysia, t } from 'elysia';

export const formModel = new Elysia({ name: 'Model.Form' }).model({
  'form.create': t.Object({
    title: t.Optional(t.String()),
    description: t.Optional(t.String()),
    themeColor: t.Optional(t.String()),
  }),
  'form.update': t.Object({
    title: t.Optional(t.String()),
    description: t.Optional(t.Nullable(t.String())),
    themeColor: t.Optional(t.String()),
    questions: t.Optional(
      t.Array(
        t.Object({
          id: t.String(),
          type: t.Union([
            t.Literal('multiple_choice'),
            t.Literal('checkbox'),
            t.Literal('short_text'),
            t.Literal('long_text'),
            t.Literal('scale'),
            t.Literal('dropdown'),
            t.Literal('date'),
            t.Literal('rating'),
          ]),
          title: t.String(),
          required: t.Boolean(),
          options: t.Optional(
            t.Array(
              t.Object({
                id: t.String(),
                label: t.String(),
              })
            )
          ),
          scaleMin: t.Optional(t.Number()),
          scaleMax: t.Optional(t.Number()),
          scaleMinLabel: t.Optional(t.String()),
          scaleMaxLabel: t.Optional(t.String()),
          ratingMax: t.Optional(t.Number()),
          placeholder: t.Optional(t.String()),
        })
      )
    ),
  }),
});
