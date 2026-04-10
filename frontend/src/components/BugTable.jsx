import './BugTable.css'

const statusColors = {
  Open: 'status-open',
  'In Progress': 'status-progress',
  Fixed: 'status-fixed',
}

export default function BugTable({ bugs, onRowClick }) {
  if (!bugs?.length) {
    return <p className="muted">No bugs found</p>
  }

  return (
    <div className="bug-table-wrapper">
      <table className="bug-table">
        <thead>
          <tr>
            <th>Bug ID</th>
            <th>Title</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {bugs.map((bug) => (
            <tr
              key={bug._id}
              onClick={() => onRowClick?.(bug)}
              className={onRowClick ? 'clickable' : ''}
            >
              <td className="mono">{bug.bugId}</td>
              <td>{bug.title}</td>
              <td>
                <span className={`status-badge ${statusColors[bug.status] || ''}`}>
                  {bug.status}
                </span>
              </td>
              <td>{new Date(bug.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
