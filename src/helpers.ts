"use strict";

const { v4: uuidv4 } = require("uuid");

function createHelpers() {
  const get = (x) => (typeof x === "string" ? x.trim() : x || "");

  /* Request → Records */
  function requestToCompany(body, current = null) {
    return {
      id: current ? current.id : uuidv4(),
      name: get(body.companyName),
      website: get(body.companyWebsite),
      street: get(body.companyStreet),
      city: get(body.companyCity),
      note: get(body.companyNote),
    };
  }

  function requestToContact(body, companyId, current = null) {
    return {
      id: current ? current.id : uuidv4(),
      company_id: companyId,
      name: get(body.contactName),
      email: get(body.contactEmail),
      phone: get(body.contactPhone || body.contactTelephone),
      note: get(body.contactNote),
    };
  }

  function requestToJob(body, current = null) {
    return {
      id: current ? current.id : uuidv4(),
      title: get(body.jobTitle),
      description: get(body.jobDescription),
      note: get(body.jobNote),
      applied: current ? (current.applied ? 1 : 0) : 0,
      answer: current ? (current.answer ? 1 : 0) : 0,
      company_id: get(body.companyId) || null,
      contact_id: get(body.contactId) || null,
    };
  }

  /* Rows → ViewModels */
  function companyRowToVm(r) {
    return {
      _id: r.id,
      name: r.name || "",
      website: r.website || "",
      street: r.street || "",
      city: r.city || "",
      note: r.note || "",
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  function contactRowToVm(r) {
    return {
      _id: r.id,
      company_id: r.company_id,
      name: r.name || "",
      email: r.email || "",
      phone: r.phone || "",
      note: r.note || "",
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  function jobRowToVm(r) {
    return {
      _id: r.id,
      title: r.title,
      description: r.description || "",
      note: r.note || "",
      applied: !!r.applied,
      answer: !!r.answer,
      company_id: r.company_id || null,
      contact_id: r.contact_id || null,
      company: {
        name: r.company_name || "",
        website: r.company_website || "",
        city: r.company_city || "",
      },
      contact: {
        name: r.contact_name || "",
        email: r.contact_email || "",
        phone: r.contact_phone || "",
      },
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  return {
    requestToCompany,
    requestToContact,
    requestToJob,
    companyRowToVm,
    contactRowToVm,
    jobRowToVm,
  };
}

module.exports = createHelpers;
