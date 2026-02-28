import { Elysia, t } from 'elysia';

const error = t.Object({ error: t.String() });

const formItem = t.Object({
  id: t.String(),
  title: t.String(),
  description: t.Nullable(t.String()),
  status: t.String(),
  themeColor: t.String(),
  questions: t.Unknown(),
  responseCount: t.Number(),
  createdAt: t.String(),
  updatedAt: t.String(),
}, { description: 'Form with response count and timestamps' });

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
  'form.item': formItem,
  'form.list': t.Array(formItem),
  'form.success': t.Object({ success: t.Boolean() }),
  'form.error': error,
});
