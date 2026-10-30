import { Segmented } from '@robert-stackflow/oneui/Segmented'

export default function ExploreYears({ year, years, onChange }) {
  return (
    <nav className="explore-years" aria-label="按年份筛选">
      <Segmented
        label="年份"
        value={year}
        onChange={onChange}
        options={[
          { value: '', label: '全部年份' },
          ...years.map((item) => ({
            value: item.year,
            label: (
              <span
                aria-label={`${item.year === 'unknown' ? '日期未记录' : item.year + ' 年'}，${item.count} 张照片`}
              >
                {item.year === 'unknown' ? '日期未记录' : item.year}
                <small aria-hidden="true">{item.count}</small>
              </span>
            ),
          })),
        ]}
      />
    </nav>
  )
}
