/**
 * Top title bar component displayed above the sidebar chat list.
 *
 * @component
 * @returns {JSX.Element}
 */
export const SidebarHeader = () => {
  return (
    <header className="h-14 bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222d34] flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-white font-bold text-base tracking-wide">
          WhatsApp Export Viewer
        </h1>
      </div>
    </header>
  );
};
