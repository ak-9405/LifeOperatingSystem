export default function PageHeader({ eyebrow, title, detail, action }) {
  return <header className="workspace-page-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{detail && <p>{detail}</p>}</div>{action}</header>;
}
