import React, { useState, useEffect } from "react";
import Select from "react-select"; // 🌟 นำเข้า react-select สำหรับเลือกผู้รับผิดชอบงาน
import "./EditWorkflowForm.css";
import apiClient from "../../api";

function EditWorkflowForm({ workflow, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    pr_number: "",
    budget_amount: "",
    fiscal_year: "",
    start_date: "",
    category: "",
    handlers: [], // 🌟 เพิ่ม handlers สำหรับเก็บ Array ของ User IDs
  });

  const [categories, setCategories] = useState([]);

  // 🌟 เพิ่ม State สำหรับจัดการตัวเลือก User ใน react-select
  const [userOptions, setUserOptions] = useState([]);
  const [selectedHandlersOptions, setSelectedHandlersOptions] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // ดึงข้อมูล Category ทั้งหมด
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get("/api/workflows/categories/");
        setCategories(response.data.results || response.data);
      } catch (error) {
        console.error("Failed to fetch workflow categories", error);
      }
    };
    fetchCategories();
  }, []);

  // 🌟 ดึงรายชื่อพนักงานที่กรองแล้ว (Eligible Handlers) สำหรับ Workflow นี้
  useEffect(() => {
    if (workflow?.id) {
      const fetchEligibleUsers = async () => {
        setIsLoadingUsers(true);
        try {
          const response = await apiClient.get(
            `/api/workflows/projects/${workflow.id}/eligible-handlers/`,
          );
          // แปลง Format เป็น { value, label } สำหรับ react-select
          const options = response.data.map((u) => ({
            value: u.id,
            label: `${u.first_name} ${u.last_name} (${u.username})`,
          }));
          setUserOptions(options);

          // เซ็ตค่าผู้รับผิดชอบเดิมที่มีอยู่แล้ว (ถ้ามี)
          if (
            workflow.handlers_details &&
            workflow.handlers_details.length > 0
          ) {
            const currentSelected = workflow.handlers_details.map((u) => ({
              value: u.id,
              label: `${u.first_name} ${u.last_name} (${u.username})`,
            }));
            setSelectedHandlersOptions(currentSelected);
          } else if (workflow.handlers && workflow.handlers.length > 0) {
            // กรณีมีเฉพาะ IDs มาใน workflow.handlers
            const currentSelected = options.filter((opt) =>
              workflow.handlers.includes(opt.value),
            );
            setSelectedHandlersOptions(currentSelected);
          }
        } catch (error) {
          console.error("Failed to fetch eligible handlers", error);
        } finally {
          setIsLoadingUsers(false);
        }
      };
      fetchEligibleUsers();
    }
  }, [workflow]);

  // ตั้งค่า Form Data ตาม prop workflow
  useEffect(() => {
    if (workflow) {
      setFormData({
        title: workflow.title || "",
        pr_number: workflow.pr_number || "",
        budget_amount: workflow.budget_amount || "",
        fiscal_year: workflow.fiscal_year || "",
        start_date: workflow.start_date
          ? new Date(workflow.start_date).toISOString().split("T")[0]
          : "",
        category: workflow.category?.id || "",
        handlers: workflow.handlers || [],
      });
    }
  }, [workflow]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🌟 Handler เมื่อมีการเปลี่ยนแปลงการเลือกผู้รับผิดชอบใน react-select
  const handleHandlersChange = (selectedOptions) => {
    const selected = selectedOptions || [];
    setSelectedHandlersOptions(selected);
    setFormData((prev) => ({
      ...prev,
      handlers: selected.map((opt) => opt.value),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      budget_amount: formData.budget_amount || null,
      fiscal_year: formData.fiscal_year || null,
      category: formData.category || null,
      handlers: formData.handlers, // 🌟 ส่งรายชื่อ User IDs ที่เลือก
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="edit-workflow-form">
      <div className="form-group">
        <label htmlFor="title">Project Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="category">Workflow Category</label>
        <select
          name="category"
          id="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="" disabled>
            -- Select a Category --
          </option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 🌟 เพิ่ม Multi-Select สำหรับเลือกผู้รับผิดชอบงาน */}
      <div className="form-group">
        <label htmlFor="handlers">Handlers (ผู้รับผิดชอบงาน)</label>
        <Select
          id="handlers"
          isMulti
          options={userOptions}
          value={selectedHandlersOptions}
          onChange={handleHandlersChange}
          isLoading={isLoadingUsers}
          placeholder="พิมพ์ชื่อ รหัสพนักงาน หรือเลือกรายชื่อ..."
          noOptionsMessage={() => "ไม่พบรายชื่อพนักงานที่เกี่ยวข้อง"}
          classNamePrefix="react-select"
        />
      </div>

      <div className="form-group">
        <label htmlFor="start_date">Workflow Start Date</label>
        <input
          type="date"
          name="start_date"
          value={formData.start_date}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="pr_number">PR Number</label>
        <input
          type="text"
          name="pr_number"
          value={formData.pr_number}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="budget_amount">Budget Amount</label>
        <input
          type="number"
          step="0.01"
          name="budget_amount"
          value={formData.budget_amount}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="fiscal_year">Fiscal Year</label>
        <input
          type="number"
          name="fiscal_year"
          value={formData.fiscal_year}
          onChange={handleChange}
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </div>
    </form>
  );
}

export default EditWorkflowForm;
