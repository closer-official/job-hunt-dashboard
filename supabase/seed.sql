insert into public.companies (name, slug, score, grade, status, role_fit, headline, risks, highlights)
values (
  'Sample Company',
  'sample-company',
  91,
  'A',
  'apply_now',
  'Product / business planning fit',
  'High-priority candidate company with strong role alignment.',
  '["Placement details need confirmation"]'::jsonb,
  '["Strong domain fit", "Clear application priority", "Good compensation signal"]'::jsonb
)
on conflict (slug) do nothing;
