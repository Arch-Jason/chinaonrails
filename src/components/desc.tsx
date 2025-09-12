export default function Desc({ desc }: { desc: string }) {
  console.log(desc);
  return (
    <div id="desc">
    {desc.split(/\n/).map((p, i) => (
        <p key={i}>{p}</p>
    ))}
    </div>
  );
}