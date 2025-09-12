export default function Desc({ desc, showLines }: { desc: string, showLines: boolean }) {
  console.log(desc);
  return showLines ? (
    <div id="desc">
    {desc.split(/\n/).map((p, i) => (
        <p key={i}>{p}</p>
    ))}
    </div>
  ) : null;
}