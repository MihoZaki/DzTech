import React from "react";
import { useController } from "react-hook-form";
import { MinusIcon, PhotoIcon } from "@heroicons/react/24/outline";

const FileUploadField = (
  { name, control, rules, accept = "image/*", multiple = true },
) => {
  const {
    field: { onChange, value, onBlur },
    fieldState: { error },
  } = useController({
    name,
    control,
    rules,
    defaultValue: [],
  });

  const [localFiles, setLocalFiles] = React.useState(value || []);

  React.useEffect(() => {
    if (value && Array.isArray(value)) {
      setLocalFiles(value);
    } else {
      setLocalFiles([]);
    }
  }, [value]);

  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files);
    if (newFiles.length === 0) return;

    const updatedLocalFiles = [...localFiles, ...newFiles];
    setLocalFiles(updatedLocalFiles);
    console.log("Files to be set:", updatedLocalFiles); // Debug log
    onChange(updatedLocalFiles);
  };

  const removeFile = (indexToRemove) => {
    const updatedLocalFiles = localFiles.filter((_, index) =>
      index !== indexToRemove
    );
    setLocalFiles(updatedLocalFiles);
    onChange(updatedLocalFiles);
  };

  const clearAllFiles = () => {
    setLocalFiles([]);
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <label className="flex flex-col items-center justify-center w-full sm:w-64 h-48 border-2 border-dashed border-base-300 rounded-lg cursor-pointer bg-base-100 hover:bg-base-200">
        <PhotoIcon className="w-12 h-12 text-gray-400" />
        <span className="text-sm text-center mt-2">Click to Upload</span>
        <input
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
          onBlur={onBlur}
        />
      </label>

      {localFiles.length > 0 && (
        <div className="flex-1 w-full">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm text-gray-500">
              Selected files ({localFiles.length}):
            </p>
            <button
              type="button"
              className="btn btn-xs btn-outline text-error"
              onClick={clearAllFiles}
            >
              Clear All
            </button>
          </div>
          <ul className="space-y-1">
            {localFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-base-200 p-2 rounded text-sm"
              >
                <span className="truncate flex-1 mr-2">{file.name}</span>
                <button
                  type="button"
                  className="btn btn-xs btn-outline btn-error"
                  onClick={() => removeFile(index)}
                >
                  <MinusIcon className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-red-500 text-xs">{error.message}</p>}
    </div>
  );
};

export default FileUploadField;
