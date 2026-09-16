/**
 * Top title bar component displayed above the sidebar chat list.
 *
 * @component
 * @returns {JSX.Element}
 */

import { getFileDetails } from "../../api/electronApi.js";

const handleImport = async () => {
  const result = await getFileDetails();

  console.log(result.filePaths[0]);
};


export const SidebarHeader = () => {

  const handleFileChange = (event) => {
    const [file] = event.target.files;
    console.log(file);



  }
  return (
    <header className="h-14 bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222d34] flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-white font-bold text-base tracking-wide">
          WhatsApp Export Viewer
        </h1>
        <button onClick={handleImport}>
          Import Chat
        </button>


      </div>
    </header>
  );
};
