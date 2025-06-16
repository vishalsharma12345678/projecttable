"use client";
import { useEffect, useRef } from "react"; // Make sure useRef is imported
import React, { useState } from "react";

import {
  FaBars,
  FaTachometerAlt,
  FaClipboardList,
  FaWrench,
  FaTools,
} from "react-icons/fa";
import { RxDragHandleDots2 } from "react-icons/rx";

export default function TechSpecSheet() {
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed(!collapsed);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<string[][][]>([]);
  const [redoStack, setRedoStack] = useState<string[][][]>([]);
  type TableRow = (string | string[])[];
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const draggedImageSource = useRef<string | null>(null);
  const draggedImageOrigin = useRef<[number, number] | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirectionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const [columnHeaders, setColumnHeaders] = useState([
    "",
    "Sno.",
    "Should Go to QA Inspection",
    "Header",
    "Measurement Type",
    "Location",
    "Measurement Picture",
    "FIT Changed",
    "FIT Grading Rule",
    "PP Changed",
    "PP Grading",
    "TOP Changed",
    "TOP Grading",
    "sdfdsfdsf",
  ]);
  const tableRef = useRef<HTMLDivElement>(null);
  const [colWidths, setColWidths] = useState(
    () => columnHeaders.map(() => 150) // default 150px per column
  );
  const isResizing = useRef(false);
  const resizingColIndex = useRef<number | null>(null);

  // const handleMouseMove = (e: MouseEvent) => {
  //   if (resizingCol.current === null) return;

  //   const ths = document.querySelectorAll("th");
  //   const th = ths[resizingCol.current] as HTMLElement;
  //   if (!th) return;

  //   const newWidth = e.clientX - th.getBoundingClientRect().left;
  //   if (newWidth > 50) {
  //     th.style.width = `${newWidth}px`;
  //   }
  // };

  // const handleMouseUp = () => {
  //   isResizing.current = false;
  //   resizingCol.current = null;
  //   document.removeEventListener("mousemove", handleMouseMove);
  //   document.removeEventListener("mouseup", handleMouseUp);
  // };
  const handleMouseMove = (e: MouseEvent) => {
    if (resizingColIndex.current === null) return;

    const thElements = document.querySelectorAll("th");
    const th = thElements[resizingColIndex.current] as HTMLElement;

    if (th) {
      const newWidth = e.clientX - th.getBoundingClientRect().left;
      if (newWidth > 40) {
        th.style.width = `${newWidth}px`;
      }
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    resizingColIndex.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // const handleResizeStart = (
  //   e: React.MouseEvent<HTMLDivElement>,
  //   index: number
  // ) => {
  //   resizingCol.current = index;
  //   document.addEventListener("mousemove", handleResizing);
  //   document.addEventListener("mouseup", stopResizing);
  // };

  // const handleResizing = (e: MouseEvent) => {
  //   if (resizingCol.current !== null) {
  //     const index = resizingCol.current;
  //     const th = document.querySelectorAll("th")[index] as HTMLElement;
  //     const left = th.getBoundingClientRect().left;
  //     const newWidth = Math.max(60, e.clientX - left);
  //     setColWidths((prev) => {
  //       const updated = [...prev];
  //       updated[index] = newWidth;
  //       return updated;
  //     });
  //   }
  // };

  // const stopResizing = () => {
  //   resizingCol.current = null;
  //   document.removeEventListener("mousemove", handleResizing);
  //   document.removeEventListener("mouseup", stopResizing);
  // };

  let lastX = 0;
  let animationFrameId: number;

  const handleResizing = (e: MouseEvent) => {
    if (resizingCol.current === null) return;

    if (e.clientX !== lastX) {
      lastX = e.clientX;
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        const index = resizingCol.current!;
        const th = document.querySelectorAll("th")[index] as HTMLElement;
        const left = th.getBoundingClientRect().left;
        const newWidth = Math.max(60, e.clientX - left);

        setColWidths((prev) => {
          const updated = [...prev];
          updated[index] = newWidth;
          return updated;
        });
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tableRef.current &&
        !tableRef.current.contains(event.target as Node)
      ) {
        setSelectedCell(null);
        setSelectedRange(null);
        setSelectionAnchor(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [tableData, setTableData] = useState<TableRow[]>(
    Array.from({ length: 5 }, () =>
      Array.from({ length: 13 }, (_, colIndex) =>
        columnHeaders[colIndex] === "Measurement Picture" ? [] : ""
      )
    )
  );
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    row: number;
    col: number;
  } | null>(null);

  const [selectionAnchor, setSelectionAnchor] = useState<
    [number, number] | null
  >(null);
  const [editingCell, setEditingCell] = useState<[number, number] | null>(null);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null
  );
  const [selectedRange, setSelectedRange] = useState<{
    start: [number, number];
    end: [number, number];
  } | null>(null);

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRow: number,
    startCol: number
  ) => {
    e.preventDefault();

    const clipboard = e.clipboardData.getData("text");

    const rows = clipboard
      .trim()
      .split(/\r?\n/)
      .map((row) => row.split("\t"));

    // Clone current table
    let updated = [...tableData];

    // 🆕 Auto-expand rows if needed
    while (updated.length < startRow + rows.length) {
      updated.push(Array(updated[0].length).fill(""));
    }

    // 🆕 Auto-expand columns if needed
    while (updated[0].length < startCol + rows[0].length) {
      updated = updated.map((row) => [
        ...row,
        ...Array(startCol + rows[0].length - row.length).fill(""),
      ]);
    }

    // Paste the copied values into the updated table
    rows.forEach((row, rowOffset) => {
      row.forEach((value, colOffset) => {
        const r = startRow + rowOffset;
        const c = startCol + colOffset;
        updated[r][c] = value;
      });
    });
    // pushToHistory(tableData);
    setTableData(updated);
  };

  const menuItems = [
    { icon: <FaTachometerAlt />, label: "Dashboard" },
    { icon: <FaClipboardList />, label: "Tech Specs" },
    { icon: <FaTools />, label: "Inspections" },
    { icon: <FaWrench />, label: "Settings" },
  ];
  const [searchTerm, setSearchTerm] = useState("");

  // Table: 5 rows x 12 cols, with editable default values

  const isCellInRange = (row: number, col: number) => {
    if (!selectedRange) return false;

    const [r1, c1] = selectedRange.start;
    const [r2, c2] = selectedRange.end;
    const rowMin = Math.min(r1, r2),
      rowMax = Math.max(r1, r2);
    const colMin = Math.min(c1, c2),
      colMax = Math.max(c1, c2);

    return row >= rowMin && row <= rowMax && col >= colMin && col <= colMax;
  };

  const pushToHistory = (data: string[][]) => {
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(data))]);
    setRedoStack([]); // clear redo stack on new action
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const updated = [...tableData];
    updated[rowIdx][colIdx] = value;

    setTableData(updated);
  };
  const autoResizeTextarea = (el: HTMLTextAreaElement) => {
    el.parentElement.style.height = "auto"; // Reset height
    el.parentElement.style.height = el.scrollHeight + "px";
    // el.style.height = "auto"; // Reset height
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (!selectedRange && !selectedCell) return;

        let start: [number, number], end: [number, number];

        if (selectedRange) {
          ({ start, end } = selectedRange);
        } else if (selectedCell) {
          start = end = selectedCell;
        } else return;

        const startRow = Math.min(start[0], end[0]);
        const endRow = Math.max(start[0], end[0]);
        const startCol = Math.min(start[1], end[1]);
        const endCol = Math.max(start[1], end[1]);

        let copiedText = "";
        for (let row = startRow; row <= endRow; row++) {
          const rowData = [];
          for (let col = startCol; col <= endCol; col++) {
            rowData.push(tableData?.[row]?.[col] ?? "");
          }
          copiedText += rowData.join("\t") + "\n";
        }

        e.preventDefault();

        // ✅ Fallback method using execCommand
        const textarea = document.createElement("textarea");
        textarea.value = copiedText;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          console.log("Copied to clipboard via fallback");
        } catch (err) {
          console.error("Fallback copy failed:", err);
        }
        document.body.removeChild(textarea);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        console.log(!selectedRange && !selectedCell);
        if (!selectedRange && !selectedCell) return;

        let start: [number, number], end: [number, number];
        if (selectedRange) {
          ({ start, end } = selectedRange);
        } else if (selectedCell) {
          start = end = selectedCell;
        } else return;

        const startRow = Math.min(start[0], end[0]);
        const endRow = Math.max(start[0], end[0]);
        const startCol = Math.min(start[1], end[1]);
        const endCol = Math.max(start[1], end[1]);

        let copiedText = "";
        const updated = [...tableData];

        for (let row = startRow; row <= endRow; row++) {
          const rowData = [];
          for (let col = startCol; col <= endCol; col++) {
            rowData.push(updated[row][col]);
            updated[row][col] = ""; // Clear content
          }
          copiedText += rowData.join("\t") + "\n";
        }

        setTableData(updated);
        e.preventDefault();

        const textarea = document.createElement("textarea");
        textarea.value = copiedText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (history.length > 0) {
          setRedoStack((r) => [tableData.map((row) => [...row]), ...r]);
          setTableData(history[history.length - 1]);
          setHistory((h) => h.slice(0, h.length - 1));
        }
      }

      // Redo
      else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        if (redoStack.length > 0) {
          setHistory((h) => [...h, tableData.map((row) => [...row])]);
          setTableData(redoStack[0]);
          setRedoStack((r) => r.slice(1));
        }
      }
      if (e.key === "Enter" && selectedCell) {
        e.preventDefault();
        setEditingCell(selectedCell);
        return;
      }

      // Escape to cancel editing
      if (e.key === "Escape" && editingCell) {
        e.preventDefault();

        setEditingCell(null);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedRange?.start?.toString(),
    selectedRange?.end?.toString(),
    selectedCell?.toString(),
  ]);
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);
  const insertRow = (index: number) => {
    const newRow = new Array(tableData[0].length).fill("");
    const updated = [
      ...tableData.slice(0, index),
      newRow,
      ...tableData.slice(index),
    ];
    setTableData(updated);
  };

  // const insertCol = (index: number) => {
  //   const updated = tableData.map((row) => [
  //     ...row.slice(0, index),
  //     "",
  //     ...row.slice(index),
  //   ]);
  //   setTableData(updated);
  // };
  // Assuming this is your current column insert logic
  const insertCol = (index: number) => {
    // update columnHeaders
    const newHeaders = [...columnHeaders];
    newHeaders.splice(index, 0, "New Column");
    setColumnHeaders(newHeaders);

    // update tableData — ⚠️ THIS is likely missing or incorrect!
    const newData = tableData.map((row) => {
      const newRow = [...row];
      newRow.splice(index, 0, ""); // <-- this part is crucial
      return newRow;
    });
    setTableData(newData);
  };

  // const insertCol = (index: number) => {
  //   const updated = tableData.map((row) => {
  //     const newRow = [...row];
  //     newRow.splice(index + 1, 0, "");
  //     return newRow;
  //   });
  //   setTableData(updated);
  // };
  // const insertCol = (colIndex: number) => {
  //   const updated = tableData.map((row) => {
  //     const newRow = [...row];
  //     newRow.splice(colIndex + 1, 0, ""); // insert empty cell
  //     return newRow;
  //   });
  //   setTableData(updated);
  // };

  const deleteRow = (index: number) => {
    if (tableData.length <= 1) return;
    const updated = [
      ...tableData.slice(0, index),
      ...tableData.slice(index + 1),
    ];
    setTableData(updated);
  };

  // const deleteCol = (index: number) => {
  //   if (tableData[0].length <= 1) return;
  //   const updated = tableData.map((row) => [
  //     ...row.slice(0, index),
  //     ...row.slice(index + 1),
  //   ]);
  //   setTableData(updated);
  // };
  const deleteCol = (deleteIndex: number) => {
    // Guard clause: don't allow deleting if there's only 1 column left
    if (columnHeaders.length <= 1) return;

    // Remove from headers
    const newHeaders = [...columnHeaders];
    newHeaders.splice(deleteIndex, 1);
    setColumnHeaders(newHeaders);

    // Remove from each row
    const newData = tableData.map((row) => {
      const newRow = [...row];
      newRow.splice(deleteIndex, 1);
      return newRow;
    });
    setTableData(newData);
  };

  const handleImagePasteOrDrop = (
    files: FileList,
    rowIndex: number,
    colIndex: number
  ) => {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (imageFiles.length === 0) return;

    const imageUrls = imageFiles.map((file) => URL.createObjectURL(file));

    setTableData((prev) => {
      const updated = [...prev];
      const current = updated[rowIndex][colIndex];

      const existingUrls = Array.isArray(current) ? current : [];
      const newUniqueUrls = imageUrls.filter(
        (url) => !existingUrls.includes(url)
      );

      updated[rowIndex][colIndex] = [...existingUrls, ...newUniqueUrls];
      return updated;
    });
  };
  const startAutoScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scroll = () => {
      if (!scrollDirectionRef.current) return;

      container.scrollBy(
        scrollDirectionRef.current.x,
        scrollDirectionRef.current.y
      );
      animationFrameRef.current = requestAnimationFrame(scroll);
    };

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(scroll);
    }
  };

  const stopAutoScroll = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };
  // const handleMouseMove = (e: MouseEvent) => {
  //   if (resizingCol.current === null) return;

  //   const index = resizingCol.current;
  //   const th = document.querySelectorAll("th")[index] as HTMLElement;
  //   const left = th.getBoundingClientRect().left;
  //   const newWidth = Math.max(60, e.clientX - left);

  //   setColWidths((prev) => {
  //     const updated = [...prev];
  //     updated[index] = newWidth;
  //     return updated;
  //   });
  // };

  // const handleMouseUp = () => {
  //   resizingCol.current = null;
  //   document.removeEventListener("mousemove", handleMouseMove);
  //   document.removeEventListener("mouseup", handleMouseUp);
  // };

  const handleMouseMoveForScroll = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const margin = 40; // distance from edge to start scrolling
    const speed = 15;

    const direction = { x: 0, y: 0 };

    if (e.clientY < rect.top + margin) direction.y = -speed;
    else if (e.clientY > rect.bottom - margin) direction.y = speed;

    if (e.clientX < rect.left + margin) direction.x = -speed;
    else if (e.clientX > rect.right - margin) direction.x = speed;

    scrollDirectionRef.current = direction;

    if (direction.x !== 0 || direction.y !== 0) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      stopAutoScroll();
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);
  function getColumnLetter(index: number): string {
    let result = "";
    while (index >= 0) {
      result = String.fromCharCode((index % 26) + 65) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  }

  return (
    <>
      {contextMenu?.visible && (
        <div
          className="absolute bg-white border rounded shadow-md z-50 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={() => setContextMenu(null)}
        >
          <ul>
            <li
              onClick={() => {
                insertRow(contextMenu.row);
                setContextMenu(null);
              }}
              className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
            >
              Insert Row Above
            </li>
            <li
              onClick={() => {
                insertRow(contextMenu.row + 1);
                setContextMenu(null);
              }}
              className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
            >
              Insert Row Below
            </li>
            <li
              onClick={() => {
                insertCol(contextMenu.col);
                setContextMenu(null);
              }}
              className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
            >
              Insert Column Left
            </li>
            <li
              onClick={() => {
                insertCol(contextMenu.col + 1);
                setContextMenu(null);
              }}
              className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
            >
              Insert Column Right
            </li>

            <li
              onClick={() => {
                deleteRow(contextMenu.row);
                setContextMenu(null);
              }}
              className="hover:bg-gray-100 px-4 py-2 cursor-pointer text-red-500"
            >
              Delete Row
            </li>

            <li
              onClick={() => {
                deleteCol(contextMenu.col);
                setContextMenu(null);
              }}
              className="hover:bg-gray-100 px-4 py-2 cursor-pointer text-red-500"
            >
              Delete Column
            </li>
          </ul>
        </div>
      )}

      <div className="flex h-screen font-sans bg-gray-100">
        {/* Sidebar */}
        <aside
          className={`transition-all duration-300 ${
            collapsed ? "w-0" : "w-64"
          } bg-gray-900 text-gray-100 flex flex-col`}
        >
          {/* Toggle Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            {!collapsed && <h2 className="text-lg font-semibold">Admin</h2>}
          </div>

          {/* Menu */}
          <nav className="flex flex-col p-2 space-y-1">
            {menuItems.map((item, idx) => (
              <a
                key={idx}
                href="#"
                className="flex items-center px-3 py-2 rounded hover:bg-gray-800"
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && (
                  <span className="ml-3 text-sm">{item.label}</span>
                )}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div
          className="flex-1 flex flex-col"
          style={{ width: "calc(100vw - 10%)" }}
        >
          {/* Navbar */}
          <header className="bg-white border-b shadow-sm px-6 py-4 text-gray-800">
            <div className="flex justify-between items-center">
              {/* Left: Search Bar */}
              <button onClick={toggleSidebar} className="text-black text-lg">
                <FaBars />
              </button>
              <div className="w-64">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring focus:ring-blue-400"
                />
              </div>

              {/* Right: Avatar + Name */}
              <div className="flex items-center space-x-3">
                <img
                  src="https://i.pravatar.cc/32"
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium">Welcome, Vishal</span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">
            <div className="bg-white p-6 rounded-xl shadow" ref={tableRef}>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                  Tech Spec Measurement Sheet
                </h1>
                <p className="text-sm text-gray-500">version - v1.4</p>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-8">
                {[
                  ["Style Name", "Buyer PO Number", "Vendor PO Number"],
                  ["Merchant Name", "Vendor Name", "Spec Valid Till"],
                  ["Tech Name", "Base Size", "QA Name", "Order Quantity"],
                ].map((row, i) =>
                  row.map((label, j) =>
                    label ? (
                      <div key={`${i}-${j}`}>
                        <label className="block text-sm font-medium text-gray-600">
                          {label}
                        </label>
                        <input
                          type="text"
                          className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring focus:ring-blue-500"
                        />
                      </div>
                    ) : (
                      <div key={`${i}-${j}`}></div>
                    )
                  )
                )}
              </div>
              {/* Table */}
              <div
                ref={scrollContainerRef}
                style={{ width: "100%" }}
                className="max-h-[600px] "
              >
                <div className="" style={{ width: "100%", overflow: "scroll" }}>
                  <table className="table-fixed w-full text-sm border-content">
                    {/* <thead>
                      <tr>
                        {tableData[0]?.map((_, i) => (
                          <th
                            key={i}
                            draggable
                            onDragStart={() => setDraggedColIndex(i)}
                            // ... drag logic
                          >
                            {getColumnLetter(i)}
                          </th>
                        ))}
                      </tr>
                    </thead> */}

                    <thead>
                      <tr>
                        {tableData[0]?.map((_, i) => (
                          <th
                            key={i}
                            draggable
                            style={{
                              position: "relative",
                              width: "150px", // Set default width
                              minWidth: "50px",
                              maxWidth: "500px",
                            }}
                            onDragStart={(e) => {
                              if (isResizing.current) {
                                e.preventDefault();
                                return;
                              }
                              setDraggedColIndex(i);
                            }}
                            onDrop={() => {
                              if (
                                draggedColIndex === null ||
                                draggedColIndex === i
                              )
                                return;
                              const updated = tableData.map((row) => {
                                const newRow = [...row];
                                const [moved] = newRow.splice(
                                  draggedColIndex,
                                  1
                                );
                                newRow.splice(i, 0, moved);
                                return newRow;
                              });
                              setTableData(updated);
                              setDraggedColIndex(null);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            className={`border  ${
                              isDragging ? "cursor-move" : "cursor-pointer"
                            }`}
                          >
                            {getColumnLetter(i)}

                            {/* Resize Handle */}
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                isResizing.current = true;
                                resizingColIndex.current = i;
                                document.addEventListener(
                                  "mousemove",
                                  handleMouseMove
                                );
                                document.addEventListener(
                                  "mouseup",
                                  handleMouseUp
                                );
                              }}
                              style={{
                                position: "absolute",
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: "6px",
                                cursor: "col-resize",
                                zIndex: 10,
                                userSelect: "none",
                              }}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {tableData
                        .filter((row) =>
                          row.some(
                            (cell) =>
                              typeof cell === "string" &&
                              cell
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase())
                          )
                        )
                        .map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            style={{ textAlign: "center" }}
                            className={`bg-white even:bg-gray-50 `}
                          >
                            {row.map((cell, colIndex) =>
                              colIndex === 0 ? (
                                <td
                                  style={{
                                    width: colWidths[colIndex],
                                    minWidth: 50,
                                  }}
                                  key={colIndex}
                                  className={`border ${
                                    draggedRowIndex
                                      ? "cursor-grabbing"
                                      : "cursor-grab"
                                  }`}
                                  draggable
                                  onDragStart={() =>
                                    setDraggedRowIndex(rowIndex)
                                  }
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={() => {
                                    if (
                                      draggedRowIndex === null ||
                                      draggedRowIndex === rowIndex
                                    )
                                      return;
                                    const updated = [...tableData];
                                    const [draggedRow] = updated.splice(
                                      draggedRowIndex,
                                      1
                                    );
                                    updated.splice(rowIndex, 0, draggedRow);
                                    setTableData(updated);
                                    setDraggedRowIndex(null);
                                  }}
                                >
                                  <RxDragHandleDots2 />
                                </td>
                              ) : colIndex === 1 ? (
                                <td
                                  className="border"
                                  style={{ textAlign: "center" }}
                                >
                                  {rowIndex + 1}
                                </td>
                              ) : columnHeaders[colIndex] ===
                                "Measurement Picture" ? (
                                <td
                                  style={{
                                    width: colWidths[colIndex],
                                    minWidth: 50,
                                  }}
                                  className={` border p-2 min-h-[80px] ${
                                    selectedCell?.[0] === rowIndex &&
                                    selectedCell?.[1] === colIndex
                                      ? "border-blue-500 ring-2 ring-blue-400"
                                      : "border-gray-300"
                                  }
                                  ${
                                    isCellInRange(rowIndex, colIndex)
                                      ? " bg-blue-100"
                                      : ""
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCell([rowIndex, colIndex]);
                                    setSelectionAnchor(null);
                                  }}
                                  onMouseDown={() => {
                                    setSelectionAnchor([rowIndex, colIndex]);
                                    setSelectedCell([rowIndex, colIndex]);
                                    setSelectedRange({
                                      start: [rowIndex, colIndex],
                                      end: [rowIndex, colIndex],
                                    });
                                    // setIsDragging(true);
                                  }}
                                  onMouseEnter={() => {
                                    if (isDragging && selectionAnchor) {
                                      setSelectedCell([rowIndex, colIndex]);
                                      setSelectedRange({
                                        start: selectionAnchor,
                                        end: [rowIndex, colIndex],
                                      });
                                    }
                                  }}
                                  onPaste={(e) => {
                                    e.preventDefault();
                                    console.log(e.clipboardData);
                                    const items = e.clipboardData?.files;
                                    if (items?.length)
                                      handleImagePasteOrDrop(
                                        items,
                                        rowIndex,
                                        colIndex
                                      );
                                  }}
                                  // onDrop={(e) => {
                                  //   e.preventDefault();
                                  //   const files = e.dataTransfer?.files;
                                  //   if (files?.length) handleImagePasteOrDrop(files, rowIndex, colIndex);
                                  // }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const files = e.dataTransfer?.files;
                                    console.log(files);
                                    console.log(draggedImageOrigin);
                                    if (
                                      draggedImageSource.current &&
                                      draggedImageOrigin.current
                                    ) {
                                      const [fromRow, fromCol] =
                                        draggedImageOrigin.current;
                                      const updated = [...tableData];

                                      // Remove from old
                                      updated[fromRow][fromCol] = (
                                        updated[fromRow][fromCol] as string[]
                                      ).filter(
                                        (img) =>
                                          img !== draggedImageSource.current
                                      );

                                      // Add to new
                                      if (
                                        !Array.isArray(
                                          updated[rowIndex][colIndex]
                                        )
                                      )
                                        updated[rowIndex][colIndex] = [];
                                      (
                                        updated[rowIndex][colIndex] as string[]
                                      ).push(draggedImageSource.current);

                                      setTableData(updated);
                                      draggedImageSource.current = null;
                                      draggedImageOrigin.current = null;
                                    } else if (files?.length) {
                                      handleImagePasteOrDrop(
                                        files,
                                        rowIndex,
                                        colIndex
                                      );
                                    }
                                  }}
                                  onDragOver={(e) => e.preventDefault()}
                                >
                                  {Array.isArray(cell) ? (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {cell.map((src, i) => (
                                        <img
                                          draggable
                                          onDragStart={(e) => {
                                            draggedImageSource.current = src;
                                            draggedImageOrigin.current = [
                                              rowIndex,
                                              colIndex,
                                            ];
                                            e.dataTransfer.setData(
                                              "text/plain",
                                              src
                                            ); // optional but good for compatibility
                                          }}
                                          key={i}
                                          src={src}
                                          className="w-16 h-16 object-cover rounded"
                                        />
                                      ))}
                                    </div>
                                  ) : (
                                    ""
                                  )}
                                  <p className="text-sm text-gray-400">
                                    Drop or paste image
                                  </p>
                                </td>
                              ) : (
                                <td
                                  style={{
                                    width: colWidths[colIndex],
                                    minWidth: 50,
                                  }}
                                  key={colIndex}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({
                                      visible: true,
                                      x: e.pageX,
                                      y: e.pageY,
                                      row: rowIndex,
                                      col: colIndex,
                                    });
                                  }}
                                  className={` border ${
                                    selectedCell?.[0] === rowIndex &&
                                    selectedCell?.[1] === colIndex
                                      ? "border-blue-500 ring-2 ring-blue-400"
                                      : "border-gray-300"
                                  }
                ${isCellInRange(rowIndex, colIndex) ? "bg-blue-100" : ""}`}
                                >
                                  <textarea
                                    value={cell}
                                    readOnly={
                                      !(
                                        editingCell?.[0] === rowIndex &&
                                        editingCell?.[1] === colIndex
                                      )
                                    }
                                    onChange={(e) => {
                                      handleCellChange(
                                        rowIndex,
                                        colIndex,
                                        e.target.value
                                      );
                                      autoResizeTextarea(e.target);
                                    }}
                                    onDoubleClick={() => {
                                      setEditingCell([rowIndex, colIndex]);
                                    }}
                                    onBlur={() => {
                                      setEditingCell(null);
                                    }}
                                    onPaste={(e) => {
                                      handlePaste(e, rowIndex, colIndex);
                                      setTimeout(
                                        () =>
                                          autoResizeTextarea(
                                            e.target as HTMLTextAreaElement
                                          ),
                                        0
                                      );
                                    }}
                                    onMouseDown={() => {
                                      setSelectionAnchor([rowIndex, colIndex]);
                                      setSelectedCell([rowIndex, colIndex]);
                                      setSelectedRange({
                                        start: [rowIndex, colIndex],
                                        end: [rowIndex, colIndex],
                                      });
                                      setIsDragging(true);
                                    }}
                                    onMouseEnter={() => {
                                      if (isDragging && selectionAnchor) {
                                        setSelectedCell([rowIndex, colIndex]);
                                        setSelectedRange({
                                          start: selectionAnchor,
                                          end: [rowIndex, colIndex],
                                        });
                                      }
                                    }}
                                    onInput={(e) =>
                                      autoResizeTextarea(
                                        e.target as HTMLTextAreaElement
                                      )
                                    }
                                    // onClick={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCell([rowIndex, colIndex]);
                                      setSelectionAnchor(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (
                                        editingCell?.[0] === rowIndex &&
                                        editingCell?.[1] === colIndex
                                      ) {
                                        if (e.key === "Escape") {
                                          e.preventDefault();
                                          setEditingCell(null);
                                          return;
                                        }
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          setEditingCell(null);
                                          return;
                                        }
                                      }
                                      if (!selectedCell) return;
                                      const [row, col] = selectedCell;
                                      let newRow = row;
                                      let newCol = col;
                                      if (e.key === "ArrowUp")
                                        newRow = Math.max(0, row - 1);
                                      else if (e.key === "ArrowDown")
                                        newRow = Math.min(
                                          tableData.length - 1,
                                          row + 1
                                        );
                                      else if (e.key === "ArrowLeft")
                                        newCol = Math.max(0, col - 1);
                                      else if (e.key === "ArrowRight")
                                        newCol = Math.min(
                                          tableData[0].length - 1,
                                          col + 1
                                        );
                                      else return;
                                      e.preventDefault();
                                      if (e.shiftKey) {
                                        const anchor =
                                          selectionAnchor || selectedCell;
                                        setSelectedRange({
                                          start: anchor,
                                          end: [newRow, newCol],
                                        });
                                        setSelectedCell([newRow, newCol]);
                                        if (!selectionAnchor)
                                          setSelectionAnchor(selectedCell);
                                      } else {
                                        setEditingCell(null);

                                        setSelectedCell([newRow, newCol]);
                                        setSelectedRange(null);
                                        setSelectionAnchor(null);
                                      }
                                    }}
                                    className={`w-full h-auto p-0 m-0 border px-2 py-1  outline-none resize-none overflow-hidden whitespace-pre-wrap break-words
                
              `}
                                    rows={1}
                                  />
                                </td>
                              )
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Buttons */}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
